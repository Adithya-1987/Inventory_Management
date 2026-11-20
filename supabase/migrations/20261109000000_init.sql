-- Inventory schema: components, append-only transactions ledger, public requests, admin allow-list.
-- Stock changes only through record_sale / record_purchase / adjust_stock (atomic: stock + ledger row together).

-- ---------- admins ----------
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.admins where user_id = (select auth.uid())) $$;

-- ---------- components ----------
create table public.components (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 200),
  category text not null default '' check (length(category) <= 100),
  quantity integer not null default 0 check (quantity >= 0),
  unit_cost numeric(12,2) not null default 0 check (unit_cost >= 0),
  sell_price numeric(12,2) not null default 0 check (sell_price >= 0),
  location text not null default '' check (length(location) <= 100),
  created_at timestamptz not null default now()
);
create unique index components_name_key on public.components (lower(name));

-- ---------- transactions (ledger) ----------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('sale', 'purchase', 'adjust')),
  component_id uuid not null references public.components(id) on delete restrict,
  qty integer not null,
  amount numeric(12,2) not null, -- sale +, purchase −, adjust 0. Balance = sum(amount).
  note text not null default '' check (length(note) <= 500),
  source text not null default 'manual' check (source in ('manual', 'agent')),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint transactions_qty_amount check (
       (type = 'sale'     and qty > 0  and amount >= 0)
    or (type = 'purchase' and qty > 0  and amount <= 0)
    or (type = 'adjust'   and qty <> 0 and amount = 0)
  )
);
create index transactions_created_at_idx on public.transactions (created_at desc);
create index transactions_component_id_idx on public.transactions (component_id);
create index transactions_created_by_idx on public.transactions (created_by);

-- ---------- requests (public form) ----------
create table public.requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 100),
  contact text not null check (length(trim(contact)) between 1 and 100),
  message text not null default '' check (length(message) <= 5000),
  file_path text check (file_path like 'uploads/%' and length(file_path) <= 300),
  file_name text check (length(file_name) <= 200),
  status text not null default 'new' check (status in ('new', 'seen', 'ordered', 'done', 'rejected')),
  admin_note text not null default '' check (length(admin_note) <= 2000),
  created_at timestamptz not null default now(),
  constraint requests_has_content check (length(trim(message)) > 0 or file_path is not null)
);
create index requests_created_at_idx on public.requests (created_at desc);

-- ---------- privileges (column-level; Supabase grants everything by default) ----------
revoke all on public.admins, public.components, public.transactions, public.requests from anon, authenticated;

grant select, delete on public.components to authenticated;
grant insert (name, category, unit_cost, sell_price, location),
      update (name, category, unit_cost, sell_price, location) on public.components to authenticated; -- quantity: functions only
grant select on public.transactions to authenticated;                                                -- writes: functions only
grant insert (name, contact, message, file_path, file_name) on public.requests to anon, authenticated; -- status/note forced to defaults
grant select, update (status, admin_note) on public.requests to authenticated;

-- ---------- row-level security ----------
alter table public.admins enable row level security;       -- no policies: not reachable through the API
alter table public.components enable row level security;
alter table public.transactions enable row level security;
alter table public.requests enable row level security;

create policy "admins manage components" on public.components
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins read transactions" on public.transactions
  for select to authenticated using ((select public.is_admin()));
create policy "anyone submits requests" on public.requests
  for insert to anon, authenticated with check (status = 'new');
create policy "admins read requests" on public.requests
  for select to authenticated using ((select public.is_admin()));
create policy "admins update requests" on public.requests
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------- stock functions ----------
create function public.record_sale(p_component_id uuid, p_qty integer, p_amount numeric default null,
                                   p_note text default '', p_source text default 'manual')
returns public.transactions
language plpgsql security definer set search_path = ''
as $$
declare c public.components; t public.transactions;
begin
  if not public.is_admin() then raise exception 'Not authorized' using errcode = '42501'; end if;
  if p_qty is null or p_qty <= 0 then raise exception 'Quantity must be a whole number above 0'; end if;
  if p_amount < 0 then raise exception 'Amount must be 0 or more'; end if;

  update public.components set quantity = quantity - p_qty
   where id = p_component_id and quantity >= p_qty
   returning * into c;
  if not found then
    select * into c from public.components where id = p_component_id;
    if not found then raise exception 'Component not found'; end if;
    raise exception 'Only % % in stock', c.quantity, c.name;
  end if;

  insert into public.transactions (type, component_id, qty, amount, note, source)
  values ('sale', c.id, p_qty, coalesce(p_amount, p_qty * c.sell_price), coalesce(p_note, ''), p_source)
  returning * into t;
  return t;
end $$;

create function public.record_purchase(p_component_id uuid, p_qty integer, p_amount numeric default null,
                                       p_note text default '', p_source text default 'manual')
returns public.transactions
language plpgsql security definer set search_path = ''
as $$
declare c public.components; t public.transactions;
begin
  if not public.is_admin() then raise exception 'Not authorized' using errcode = '42501'; end if;
  if p_qty is null or p_qty <= 0 then raise exception 'Quantity must be a whole number above 0'; end if;
  if p_amount < 0 then raise exception 'Amount must be 0 or more'; end if;

  update public.components set quantity = quantity + p_qty where id = p_component_id returning * into c;
  if not found then raise exception 'Component not found'; end if;

  insert into public.transactions (type, component_id, qty, amount, note, source)
  values ('purchase', c.id, p_qty, -coalesce(p_amount, p_qty * c.unit_cost), coalesce(p_note, ''), p_source)
  returning * into t;
  return t;
end $$;

-- p_qty is a signed delta (e.g. -2 damaged). No money moves.
create function public.adjust_stock(p_component_id uuid, p_qty integer,
                                    p_note text default '', p_source text default 'manual')
returns public.transactions
language plpgsql security definer set search_path = ''
as $$
declare c public.components; t public.transactions;
begin
  if not public.is_admin() then raise exception 'Not authorized' using errcode = '42501'; end if;
  if p_qty is null or p_qty = 0 then raise exception 'Adjustment must be a non-zero whole number'; end if;

  update public.components set quantity = quantity + p_qty
   where id = p_component_id and quantity + p_qty >= 0
   returning * into c;
  if not found then
    select * into c from public.components where id = p_component_id;
    if not found then raise exception 'Component not found'; end if;
    raise exception 'Only % % in stock', c.quantity, c.name;
  end if;

  insert into public.transactions (type, component_id, qty, amount, note, source)
  values ('adjust', c.id, p_qty, 0, coalesce(p_note, ''), p_source)
  returning * into t;
  return t;
end $$;

-- RLS applies (invoker): non-admins get 0.
create function public.get_balance() returns numeric
language sql stable security invoker set search_path = ''
as $$ select coalesce(sum(amount), 0) from public.transactions $$;

revoke execute on function public.is_admin(), public.get_balance(),
  public.record_sale(uuid, integer, numeric, text, text),
  public.record_purchase(uuid, integer, numeric, text, text),
  public.adjust_stock(uuid, integer, text, text) from public, anon;
grant execute on function public.is_admin(), public.get_balance(),
  public.record_sale(uuid, integer, numeric, text, text),
  public.record_purchase(uuid, integer, numeric, text, text),
  public.adjust_stock(uuid, integer, text, text) to authenticated;

-- ---------- storage: uploaded request sheets ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('request-files', 'request-files', false, 5242880, array[
  'text/csv', 'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/pdf', 'image/png', 'image/jpeg', 'image/webp'
]);

create policy "anyone uploads request files" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'request-files' and (storage.foldername(name))[1] = 'uploads');
create policy "admins read request files" on storage.objects
  for select to authenticated
  using (bucket_id = 'request-files' and (select public.is_admin()));
