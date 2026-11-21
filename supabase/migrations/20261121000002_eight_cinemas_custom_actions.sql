alter table public.eight_cinemas_work
  drop constraint eight_cinemas_work_card_id_check,
  add constraint eight_cinemas_work_card_id_check check (
    card_id ~ '^[GC][1-8]-[1-8]$'
    or card_id ~ '^N-[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
  );
