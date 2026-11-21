grant select, insert on public.eight_cinemas_work to anon;
grant update (changes, revision) on public.eight_cinemas_work to anon;

create policy "Public can read cinema cards" on public.eight_cinemas_work
  for select to anon using (true);
create policy "Public can create cinema card records" on public.eight_cinemas_work
  for insert to anon with check (true);
create policy "Public can update cinema cards" on public.eight_cinemas_work
  for update to anon using (true) with check (true);
