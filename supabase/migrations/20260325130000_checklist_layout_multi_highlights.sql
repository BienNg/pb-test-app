-- Allow multiple highlighted checklist items per layout row.
alter table public.shot_technique_checklist_layout
  add column if not exists highlighted_item_labels text[] not null default '{}';

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'shot_technique_checklist_layout'
      and column_name = 'highlighted_item_label'
  ) then
    update public.shot_technique_checklist_layout
    set highlighted_item_labels = case
      when highlighted_item_label is not null and length(trim(highlighted_item_label)) > 0
      then array[highlighted_item_label]
      else '{}'::text[]
    end;
    alter table public.shot_technique_checklist_layout
      drop column highlighted_item_label;
  end if;
end $$;
