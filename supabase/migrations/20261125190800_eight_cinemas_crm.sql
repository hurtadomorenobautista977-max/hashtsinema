create table public.eight_cinemas_crm_tags (
  scope smallint not null check (scope between -1 and 7),
  name text not null check (char_length(name) between 1 and 100 and name = btrim(name)),
  primary key (scope, name)
);

create table public.eight_cinemas_crm_calls (
  id uuid primary key,
  cinema_id smallint not null check (cinema_id between 0 and 7),
  caller_scope smallint generated always as ((-1)::smallint) stored,
  caller text not null,
  contact text not null,
  call_date date not null,
  report text not null check (char_length(btrim(report)) between 1 and 20000),
  created_at timestamptz not null default now(),
  foreign key (caller_scope, caller) references public.eight_cinemas_crm_tags (scope, name),
  foreign key (cinema_id, contact) references public.eight_cinemas_crm_tags (scope, name)
);

create index eight_cinemas_crm_calls_history_idx
  on public.eight_cinemas_crm_calls (cinema_id, call_date desc, created_at desc, id desc);

alter table public.eight_cinemas_crm_tags enable row level security;
alter table public.eight_cinemas_crm_calls enable row level security;

revoke all on public.eight_cinemas_crm_tags, public.eight_cinemas_crm_calls from public, anon, authenticated;
grant select, insert on public.eight_cinemas_crm_tags, public.eight_cinemas_crm_calls to authenticated;

create policy "Eight cinemas members read CRM tags"
  on public.eight_cinemas_crm_tags for select to authenticated
  using (exists (select 1 from public.eight_cinemas_members where user_id = (select auth.uid())));

create policy "Eight cinemas members add CRM tags"
  on public.eight_cinemas_crm_tags for insert to authenticated
  with check (exists (select 1 from public.eight_cinemas_members where user_id = (select auth.uid())));

create policy "Eight cinemas members read CRM calls"
  on public.eight_cinemas_crm_calls for select to authenticated
  using (exists (select 1 from public.eight_cinemas_members where user_id = (select auth.uid())));

create policy "Eight cinemas members add CRM calls"
  on public.eight_cinemas_crm_calls for insert to authenticated
  with check (exists (select 1 from public.eight_cinemas_members where user_id = (select auth.uid())));
