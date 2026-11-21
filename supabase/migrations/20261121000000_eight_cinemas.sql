create table public.eight_cinemas_members (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table public.eight_cinemas_work (
  card_id text primary key check (card_id ~ '^[GC][1-8]-[1-8]$'),
  changes jsonb not null default '{}'::jsonb check (jsonb_typeof(changes) = 'object'),
  revision integer not null default 1 check (revision > 0)
);
alter table public.eight_cinemas_members enable row level security;
alter table public.eight_cinemas_work enable row level security;
revoke all on public.eight_cinemas_members, public.eight_cinemas_work from public, anon, authenticated;
grant select on public.eight_cinemas_members to authenticated;
grant select, insert on public.eight_cinemas_work to authenticated;
grant update (changes, revision) on public.eight_cinemas_work to authenticated;
create policy "Member can see own membership" on public.eight_cinemas_members
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Members can read cinema cards" on public.eight_cinemas_work
  for select to authenticated using (exists (select 1 from public.eight_cinemas_members));
create policy "Members can create cinema card records" on public.eight_cinemas_work
  for insert to authenticated with check (exists (select 1 from public.eight_cinemas_members));
create policy "Members can update cinema cards" on public.eight_cinemas_work
  for update to authenticated using (exists (select 1 from public.eight_cinemas_members))
  with check (exists (select 1 from public.eight_cinemas_members));
