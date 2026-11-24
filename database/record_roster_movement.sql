-- Keep roster changes and movement history in one transaction.
create or replace function public.record_roster_movement(
  p_account_id bigint,
  p_employee_id bigint,
  p_action text,
  p_effective_date date,
  p_reason text,
  p_to_position_id bigint,
  p_actor_employee_id bigint
)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_employee record;
  current_assignment record;
  next_status_id bigint;
  movement_id bigint;
  company_exit boolean;
begin
  if p_effective_date is null or p_effective_date > (now() at time zone 'Asia/Manila')::date then
    raise exception 'Choose a valid date on or before today.' using errcode = '22023';
  end if;
  if p_actor_employee_id is null then
    raise exception 'A recorded-by employee is required.' using errcode = '22023';
  end if;

  select id, employee_name, position_id, status_id
    into current_employee
    from public.employees
   where id = p_employee_id
   for update;
  if not found then
    raise exception 'Employee was not found.' using errcode = 'P0002';
  end if;

  select assignment_id, lob_id, effective_from
    into current_assignment
    from public.employee_assignments
   where employee_id = p_employee_id
     and account_id = p_account_id
     and effective_to is null
   order by assignment_id desc
   limit 1
   for update;
  if not found then
    raise exception 'Employee is no longer assigned to this account.' using errcode = 'P0002';
  end if;
  if current_assignment.effective_from is not null
     and p_effective_date < (current_assignment.effective_from at time zone 'Asia/Manila')::date then
    raise exception 'The event date precedes the account assignment.' using errcode = '22023';
  end if;

  if p_action = 'promote' then
    if p_to_position_id is null or p_to_position_id is not distinct from current_employee.position_id then
      raise exception 'Choose a different position.' using errcode = '22023';
    end if;
    if not exists (select 1 from public.positions where position_id = p_to_position_id) then
      raise exception 'Position was not found.' using errcode = 'P0002';
    end if;

    insert into operation_system.employee_movement_history
      (employee_id, employee_name_snapshot, reason, separation_date,
       from_account_id, to_account_id, from_lob_id, to_lob_id,
       from_position_id, to_position_id, exit_scope, recorded_by_employee_id)
    values
      (p_employee_id, current_employee.employee_name, 'PROMOTED', p_effective_date,
       p_account_id, p_account_id, current_assignment.lob_id, current_assignment.lob_id,
       current_employee.position_id, p_to_position_id, 'none', p_actor_employee_id)
    returning id into movement_id;

    update public.employees set position_id = p_to_position_id where id = p_employee_id;
  elsif p_action = 'offboard' then
    if p_reason is null or p_reason not in ('RESIGNED', 'AWOL', 'TERMINATED', 'ACCOUNT REMOVED', 'REPROFILED') then
      raise exception 'Choose a valid offboarding reason.' using errcode = '22023';
    end if;
    company_exit := p_reason in ('RESIGNED', 'AWOL', 'TERMINATED');
    if company_exit and exists (
      select 1 from public.employee_assignments
       where employee_id = p_employee_id
         and effective_to is null
         and effective_from is not null
         and (effective_from at time zone 'Asia/Manila')::date > p_effective_date
    ) then
      raise exception 'The exit date precedes another active assignment.' using errcode = '22023';
    end if;

    insert into operation_system.employee_movement_history
      (employee_id, employee_name_snapshot, reason, separation_date,
       from_account_id, from_lob_id, from_position_id, exit_scope, recorded_by_employee_id)
    values
      (p_employee_id, current_employee.employee_name, p_reason, p_effective_date,
       p_account_id, current_assignment.lob_id, current_employee.position_id,
       case when company_exit then 'company' else 'account' end, p_actor_employee_id)
    returning id into movement_id;

    update public.employee_assignments
       set effective_to = (p_effective_date + 1)::timestamp at time zone 'Asia/Manila'
     where employee_id = p_employee_id
       and effective_to is null
       and (company_exit or account_id = p_account_id);

    if company_exit then
      select status_id into next_status_id
        from public.statuses
       where status_name = case p_reason
         when 'RESIGNED' then 'Resigned'
         when 'AWOL' then 'AWOL'
         else 'Inactive'
       end;
      if next_status_id is null then
        raise exception 'The required employee status is missing.' using errcode = 'P0002';
      end if;
      update public.employees set status_id = next_status_id where id = p_employee_id;
    end if;
  else
    raise exception 'Unknown roster action.' using errcode = '22023';
  end if;

  return movement_id;
end;
$$;

revoke all on function public.record_roster_movement(bigint,bigint,text,date,text,bigint,bigint)
  from public, anon, authenticated;
grant execute on function public.record_roster_movement(bigint,bigint,text,date,text,bigint,bigint)
  to service_role;
