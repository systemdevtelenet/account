create schema if not exists operation_system;

create table operation_system.employee_movement_history (
  id bigint generated always as identity primary key,
  employee_id bigint references public.employees(id) on delete restrict,
  employee_name_snapshot text,
  reason text,
  separation_date date,
  from_account_id bigint references public.accounts(account_id) on delete restrict,
  to_account_id bigint references public.accounts(account_id) on delete restrict,
  from_lob_id bigint references public.lobs(lob_id) on delete restrict,
  to_lob_id bigint references public.lobs(lob_id) on delete restrict,
  from_position_id bigint references public.positions(position_id) on delete restrict,
  to_position_id bigint references public.positions(position_id) on delete restrict,
  exit_scope text not null default 'unknown'
    check (exit_scope in ('company', 'account', 'lob', 'none', 'unknown')),
  recorded_by_employee_id bigint references public.employees(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint movement_identity_required check (
    employee_id is not null or nullif(btrim(employee_name_snapshot), '') is not null
  ),
  constraint movement_from_lob_requires_account check (
    from_lob_id is null or from_account_id is not null
  ),
  constraint movement_to_lob_requires_account check (
    to_lob_id is null or to_account_id is not null
  )
);

comment on table operation_system.employee_movement_history is
  'Operation System separation, promotion, transfer, reprofile, and position change history. Use exit_scope to distinguish company, account, and LOB departures from internal movements; unknown scopes remain unclassified.';
comment on column operation_system.employee_movement_history.employee_id is
  'Optional verified link to the current employee directory. Preserve unmatched historical people with employee_name_snapshot.';
comment on column operation_system.employee_movement_history.separation_date is
  'Single event date for separation, promotion, transfer, reprofile, or position change. Historical imports retain the date supplied by the source sheet. Reporting months are derived when querying.';
comment on column operation_system.employee_movement_history.exit_scope is
  'Distinguishes company exits from account/LOB departures and internal movement. Does not classify a promotion as company attrition.';

create index movement_employee_idx on operation_system.employee_movement_history(employee_id);
create index movement_from_account_date_idx on operation_system.employee_movement_history(from_account_id, separation_date);
create index movement_to_account_date_idx on operation_system.employee_movement_history(to_account_id, separation_date);
create index movement_from_lob_idx on operation_system.employee_movement_history(from_lob_id);
create index movement_to_lob_idx on operation_system.employee_movement_history(to_lob_id);
create index movement_from_position_idx on operation_system.employee_movement_history(from_position_id);
create index movement_to_position_idx on operation_system.employee_movement_history(to_position_id);
create index movement_recorded_by_idx on operation_system.employee_movement_history(recorded_by_employee_id);
create index movement_reporting_idx on operation_system.employee_movement_history(separation_date, exit_scope);

create function operation_system.validate_employee_movement()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.from_lob_id is not null and not exists (
    select 1 from public.lobs
    where lob_id = new.from_lob_id and account_id = new.from_account_id
  ) then
    raise exception 'The source LOB must belong to the source account.'
      using errcode = '23514';
  end if;

  if new.to_lob_id is not null and not exists (
    select 1 from public.lobs
    where lob_id = new.to_lob_id and account_id = new.to_account_id
  ) then
    raise exception 'The destination LOB must belong to the destination account.'
      using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' then
    new.created_at := old.created_at;
    new.updated_at := clock_timestamp();
  end if;
  return new;
end;
$$;

create trigger validate_employee_movement_before_write
before insert or update on operation_system.employee_movement_history
for each row execute function operation_system.validate_employee_movement();

alter table operation_system.employee_movement_history enable row level security;

create policy movement_service_role_access
on operation_system.employee_movement_history
for all to service_role
using (true)
with check (true);

-- The app currently authorizes users in server routes and queries with the
-- service role. Browser roles receive no direct access to personnel history.
revoke all on operation_system.employee_movement_history from public, anon, authenticated;
revoke all on sequence operation_system.employee_movement_history_id_seq from public, anon, authenticated;
revoke all on function operation_system.validate_employee_movement() from public, anon, authenticated;
grant usage on schema operation_system to service_role;
grant select, insert, update, delete on operation_system.employee_movement_history to service_role;
grant usage, select on sequence operation_system.employee_movement_history_id_seq to service_role;
grant execute on function operation_system.validate_employee_movement() to service_role;

notify pgrst, 'reload schema';

