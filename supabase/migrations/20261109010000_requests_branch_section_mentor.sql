-- Request form asks for branch, section and mentor instead of name and contact.
-- Table was empty when this ran, so the new columns can be NOT NULL without defaults.
alter table public.requests drop column name, drop column contact;
alter table public.requests
  add column branch text not null check (length(trim(branch)) between 1 and 50),
  add column section text not null check (length(trim(section)) between 1 and 20),
  add column mentor text not null check (length(trim(mentor)) between 1 and 100);

-- Column-level insert grant must list the new columns (status/admin_note stay forced to defaults).
revoke insert on public.requests from anon, authenticated;
grant insert (branch, section, mentor, message, file_path, file_name) on public.requests to anon, authenticated;
