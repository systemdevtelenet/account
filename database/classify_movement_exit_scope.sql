-- Classify only unclassified RM history rows. Existing manual classifications
-- remain untouched. Reprofiled is provisionally treated as an account exit.
update operation_system.employee_movement_history
set exit_scope = case upper(btrim(reason))
  when 'RESIGNED' then 'company'
  when 'AWOL' then 'company'
  when 'TERMINATED' then 'company'
  when 'ACCOUNT REMOVED' then 'account'
  when 'REPROFILED' then 'account'
  when 'PROMOTED' then 'none'
  else exit_scope
end
where exit_scope = 'unknown'
  and upper(btrim(reason)) in
    ('RESIGNED', 'AWOL', 'TERMINATED', 'ACCOUNT REMOVED', 'REPROFILED', 'PROMOTED');
