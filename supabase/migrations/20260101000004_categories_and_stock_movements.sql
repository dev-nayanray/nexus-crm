-- ────────────────────────────────────────────────────────────────────────────
-- Dynamic Category Management + Stock Movement audit trail
-- Additive only: no existing table is dropped or has data removed.
-- Run with: prisma migrate deploy   (or) prisma db push --accept-data-loss
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists "Category" (
  id          text primary key not null,
  name        text not null,
  slug        text unique not null,
  description text,
  image_url   text,
  status      text not null default 'ACTIVE',
  sort_order  integer not null default 0,
  parent_id   text references "Category"(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_category_parent_id on "Category"(parent_id);
create index if not exists idx_category_status on "Category"(status);
create index if not exists idx_category_sort_order on "Category"(sort_order);

-- Product gains a real FK to Category. The legacy free-text `category` column
-- is left untouched so existing rows and any external reports keep working.
alter table "Product" add column if not exists category_id text references "Category"(id) on delete set null;
create index if not exists idx_product_category_id on "Product"(category_id);

create table if not exists "StockMovement" (
  id              text primary key not null,
  inventory_id    text not null references "Inventory"(id) on delete cascade,
  product_id      text not null references "Product"(id),
  type            text not null, -- RECEIVE | ADJUST | SALE | RETURN | DAMAGE | TRANSFER | CORRECTION
  quantity_change integer not null,
  quantity_after  integer not null,
  reason          text,
  reference       text,
  user_id         text references "User"(id),
  created_at      timestamptz not null default now()
);
create index if not exists idx_stockmovement_inventory_id on "StockMovement"(inventory_id);
create index if not exists idx_stockmovement_product_id on "StockMovement"(product_id);
create index if not exists idx_stockmovement_type on "StockMovement"(type);
create index if not exists idx_stockmovement_created_at on "StockMovement"(created_at);

create trigger trg_category_updated before update on "Category" for each row execute function update_updated_at();

-- RLS: match the pattern used for the rest of the schema (see
-- 20260101000001_rls_policies.sql) — Category follows Product's rule (readable
-- by everyone, writable by admins); StockMovement follows Inventory's rule
-- (readable by managers+, writable by admins) since it's an audit trail.
alter table "Category" enable row level security;
alter table "StockMovement" enable row level security;

create policy "Categories: select" on "Category" for select
  using (true);  -- all authenticated users can read categories
create policy "Categories: insert" on "Category" for insert
  with check (current_user_is_admin());
create policy "Categories: update" on "Category" for update
  using (current_user_is_admin());
create policy "Categories: delete" on "Category" for delete
  using (current_user_is_admin());

create policy "StockMovement: select" on "StockMovement" for select
  using (current_user_is_manager_or_above());
create policy "StockMovement: insert" on "StockMovement" for insert
  with check (current_user_is_admin());
-- Movements are an immutable audit log — no update/delete policy is defined,
-- so even admins cannot alter or remove history through the API/PostgREST.
