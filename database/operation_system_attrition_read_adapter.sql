create view public.operation_system_attrition_events
with (security_invoker = true)
as
select id, employee_id, reason, separation_date, from_account_id, to_account_id, exit_scope
from operation_system.employee_movement_history;
revoke all on public.operation_system_attrition_events from public, anon, authenticated;
grant select on public.operation_system_attrition_events to service_role;
comment on view public.operation_system_attrition_events is
  'Server-only read adapter for Operation System attrition reporting. Underlying movement history RLS remains enforced.';
notify pgrst, 'reload schema';
