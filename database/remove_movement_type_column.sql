do $$
declare
 before_count bigint;
 after_count bigint;
 before_hash text;
 after_hash text;
begin
 lock table operation_system.employee_movement_history in access exclusive mode;
 select count(*),md5(coalesce(string_agg((to_jsonb(m)-'movement_type')::text,E'\n' order by id),''))
 into before_count,before_hash from operation_system.employee_movement_history m;

 alter table operation_system.employee_movement_history drop column movement_type;
 create index movement_reporting_idx
 on operation_system.employee_movement_history(separation_date,exit_scope);

 select count(*),md5(coalesce(string_agg(to_jsonb(m)::text,E'\n' order by id),''))
 into after_count,after_hash from operation_system.employee_movement_history m;
 if before_count<>after_count or before_hash is distinct from after_hash then
  raise exception 'Movement records changed unexpectedly while removing movement_type';
 end if;
end;
$$;
notify pgrst, 'reload schema';
