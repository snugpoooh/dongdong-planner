-- Older app versions only know some top-level sections of the planner JSON. If one of them saves,
-- keep any section it didn't send (e.g. routines) instead of dropping it.
create or replace function public.planner_data_keep_keys()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.data := coalesce(old.data, '{}'::jsonb) || coalesce(new.data, '{}'::jsonb);
  return new;
end;
$$;

drop trigger if exists planner_data_keep_keys on public.planner_data;
create trigger planner_data_keep_keys
  before update on public.planner_data
  for each row execute function public.planner_data_keep_keys();
