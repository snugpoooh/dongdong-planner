-- One row per account holding that account's whole planner (JSON).
create table if not exists public.planner_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb       not null default '{}'::jsonb,
  rev        bigint      not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.planner_data enable row level security;

drop policy if exists "planner_data select own" on public.planner_data;
drop policy if exists "planner_data insert own" on public.planner_data;
drop policy if exists "planner_data update own" on public.planner_data;
drop policy if exists "planner_data delete own" on public.planner_data;

create policy "planner_data select own" on public.planner_data
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "planner_data insert own" on public.planner_data
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "planner_data update own" on public.planner_data
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "planner_data delete own" on public.planner_data
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.planner_data from anon;
grant select, insert, update, delete on public.planner_data to authenticated;

-- Live updates to the other signed-in devices.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'planner_data'
  ) then
    alter publication supabase_realtime add table public.planner_data;
  end if;
end $$;

-- Lets a signed-in user delete their own account (their planner row goes with it via the cascade).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
