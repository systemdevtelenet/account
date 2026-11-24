create or replace function operation_system.validate_employee_movement()
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


do $$
declare
 before_count bigint;
 after_count bigint;
 before_hash text;
 after_hash text;
begin
 lock table operation_system.employee_movement_history in access exclusive mode;
 select count(*),md5(coalesce(string_agg(
 ((to_jsonb(m)-array['effective_date','report_month','date_precision','source_date_raw','updated_at'])
 || jsonb_build_object('separation_date',coalesce(effective_date,to_date(nullif(btrim(source_date_raw),''),'Month DD, YYYY'))))::text,
 E'\n' order by id),'')) into before_count,before_hash
 from operation_system.employee_movement_history m;

 alter table operation_system.employee_movement_history
  drop constraint movement_exact_date_required,
  drop constraint movement_date_matches_month,
  drop column report_month,
  drop column date_precision;
 alter table operation_system.employee_movement_history rename column effective_date to separation_date;
 update operation_system.employee_movement_history
 set separation_date=to_date(nullif(btrim(source_date_raw),''),'Month DD, YYYY')
 where separation_date is null and nullif(btrim(source_date_raw),'') is not null;
 alter table operation_system.employee_movement_history drop column source_date_raw;

 comment on column operation_system.employee_movement_history.separation_date is
  'Single event date for separation, promotion, transfer, reprofile, or position change. Historical imports retain the date supplied by the source sheet. Reporting months are derived when querying.';

 create index movement_from_account_date_idx on operation_system.employee_movement_history(from_account_id,separation_date);
 create index movement_to_account_date_idx on operation_system.employee_movement_history(to_account_id,separation_date);
 create index movement_reporting_idx on operation_system.employee_movement_history(separation_date,movement_type,exit_scope);

 select count(*),md5(coalesce(string_agg((to_jsonb(m)-'updated_at')::text,E'\n' order by id),''))
 into after_count,after_hash from operation_system.employee_movement_history m;
 if before_count<>after_count or before_hash is distinct from after_hash then
  raise exception 'Movement data failed preservation checks during date consolidation';
 end if;
end;
$$;
notify pgrst, 'reload schema';
