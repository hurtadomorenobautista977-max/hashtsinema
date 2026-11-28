alter table public.eight_cinemas_crm_calls
  alter column caller drop not null,
  alter column contact drop not null,
  alter column call_date drop not null,
  alter column report drop not null;
