begin;
do $$
declare
  first_employee bigint;
  first_position bigint;
  second_position bigint;
  sample_lob bigint;
  sample_account bigint;
  other_account bigint;
  stored_date date;
begin
  select id into strict first_employee from public.employees order by id limit 1;
  select position_id into strict first_position from public.positions order by position_id limit 1;
  select position_id into strict second_position from public.positions where position_id <> first_position order by position_id limit 1;
  select l.lob_id, l.account_id into strict sample_lob, sample_account
    from public.lobs l join public.accounts a using(account_id) order by l.lob_id limit 1;
  select account_id into strict other_account from public.accounts where account_id <> sample_account order by account_id limit 1;

  insert into operation_system.employee_movement_history
    (id, employee_name_snapshot, reason, separation_date,
     from_account_id, from_lob_id, exit_scope)
    overriding system value
    values (-1, 'ROLLBACK TEST: historical person', 'RESIGNED',
      '2026-04-15', sample_account, sample_lob, 'company');
  select separation_date into stored_date from operation_system.employee_movement_history where id = -1;
  assert stored_date = date '2026-04-15', 'Event date was not preserved';
  assert date_trunc('month', stored_date::timestamp)::date = date '2026-04-01', 'Reporting month cannot be derived from the event date';

  insert into operation_system.employee_movement_history
    (id, employee_id, separation_date, from_position_id, to_position_id,
     exit_scope, recorded_by_employee_id)
    overriding system value
    values (-2, first_employee, '2026-05-10', first_position,
      second_position, 'none', first_employee);

  insert into operation_system.employee_movement_history
    (id, employee_name_snapshot)
    overriding system value
    values (-3, 'ROLLBACK TEST: unknown-date person');


  begin
    insert into operation_system.employee_movement_history
      (id, employee_name_snapshot, separation_date, from_account_id, from_lob_id)
      overriding system value values (-4, 'ROLLBACK TEST', '2026-05-10', other_account, sample_lob);
    raise exception 'FAIL: LOB/account mismatch was accepted';
  exception when check_violation then null;
  end;

  begin
    insert into operation_system.employee_movement_history
      (id, employee_id, separation_date)
      overriding system value values (-4, -9223372036854775808, '2026-05-10');
    raise exception 'FAIL: missing employee reference was accepted';
  exception when foreign_key_violation then null;
  end;


  update operation_system.employee_movement_history
    set reason = 'ROLLBACK TEST: update', updated_at = '2000-01-01' where id = -1;
  assert (select updated_at > timestamptz '2000-01-01' from operation_system.employee_movement_history where id = -1),
    'Update timestamp trigger failed';

  assert not has_table_privilege('anon', 'operation_system.employee_movement_history', 'SELECT'),
    'Anonymous role can read movement history';
  assert not has_table_privilege('authenticated', 'operation_system.employee_movement_history', 'SELECT'),
    'Browser role can read movement history directly';
  assert has_table_privilege('service_role', 'operation_system.employee_movement_history', 'SELECT')
    and has_table_privilege('service_role', 'operation_system.employee_movement_history', 'INSERT')
    and has_table_privilege('service_role', 'operation_system.employee_movement_history', 'UPDATE')
    and has_table_privilege('service_role', 'operation_system.employee_movement_history', 'DELETE'),
    'Server service role is missing access';
  assert (select relrowsecurity from pg_class where oid = 'operation_system.employee_movement_history'::regclass),
    'RLS is not enabled';
end;
$$;
set local role service_role;
insert into operation_system.employee_movement_history
  (id, employee_name_snapshot, separation_date)
  overriding system value values (-5, 'ROLLBACK TEST: service role write', '2026-06-12');
select count(*) = 4 as service_role_reads_and_writes_test_records
from operation_system.employee_movement_history where id in (-1,-2,-3,-5);
reset role;
rollback;

