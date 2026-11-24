do $$
declare
  before_count bigint;
  after_count bigint;
  before_hash text;
  after_hash text;
  removed_columns text[] := array['notes','review_status','source_document_id','source_sheet_id','source_sheet_name','source_row_number','source_name_raw','source_record_key','source_person_index'];
begin
  lock table operation_system.employee_movement_history in access exclusive mode;
  select count(*), md5(coalesce(string_agg((to_jsonb(m) - removed_columns)::text, E'\n' order by id), ''))
    into before_count, before_hash from operation_system.employee_movement_history m;

  drop index operation_system.movement_reporting_idx;
  alter table operation_system.employee_movement_history
    drop column notes,
    drop column review_status,
    drop column source_document_id,
    drop column source_sheet_id,
    drop column source_sheet_name,
    drop column source_row_number,
    drop column source_name_raw,
    drop column source_record_key,
    drop column source_person_index;

  -- Preserve the useful promotion validation without requiring removed review metadata.
  alter table operation_system.employee_movement_history
    add constraint movement_known_promotion_positions_differ check (
      movement_type <> 'promotion' or from_position_id is null or to_position_id is null
      or from_position_id <> to_position_id
    );

  create index movement_reporting_idx
    on operation_system.employee_movement_history(report_month, movement_type, exit_scope);

  comment on table operation_system.employee_movement_history is
    'Operation System separation, promotion, transfer, reprofile, and position change history. Use exit_scope to distinguish company, account, and LOB departures from internal movements; unknown scopes remain unclassified.';

  select count(*), md5(coalesce(string_agg((to_jsonb(m) - removed_columns)::text, E'\n' order by id), ''))
    into after_count, after_hash from operation_system.employee_movement_history m;
  if after_count <> before_count or after_hash is distinct from before_hash then
    raise exception 'Movement history changed unexpectedly while removing metadata columns';
  end if;
end;
$$;
notify pgrst, 'reload schema';
