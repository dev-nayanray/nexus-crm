-- ────────────────────────────────────────────────────────────────────────────
-- Multi-warehouse inventory
-- Additive + backfilled: no existing rows are dropped. Every current
-- Inventory/StockMovement row is assigned to a new "Main Warehouse" so
-- nothing breaks; you can add more warehouses and move stock afterwards.
-- Run with: prisma migrate deploy   (or) prisma db push --accept-data-loss
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists "Warehouse" (
  id         text primary key not null,
  name       text not null,
  code       text unique not null,
  address    text,
  city       text,
  is_default boolean not null default false,
  status     text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_warehouse_status on "Warehouse"(status);

-- Seed the default warehouse that existing stock will be backfilled into.
insert into "Warehouse" (id, name, code, is_default, status)
values ('main-wh', 'Main Warehouse', 'MAIN-01', true, 'ACTIVE')
on conflict do nothing;

-- Inventory: add warehouse_id nullable first, backfill, then enforce NOT NULL
alter table "Inventory" add column if not exists warehouse_id text;
update "Inventory" set warehouse_id = 'main-wh' where warehouse_id is null;
alter table "Inventory" alter column warehouse_id set not null;
alter table "Inventory" add constraint inventory_warehouse_id_fkey
  foreign key (warehouse_id) references "Warehouse"(id);
create index if not exists idx_inventory_warehouse_id on "Inventory"(warehouse_id);

-- Replace the old one-row-per-product constraint with one-row-per-product-per-warehouse
alter table "Inventory" drop constraint if exists "Inventory_product_id_key";
alter table "Inventory" add constraint inventory_product_id_warehouse_id_key
  unique (product_id, warehouse_id);

-- StockMovement: same nullable-then-backfill-then-not-null pattern
alter table "StockMovement" add column if not exists warehouse_id text;
update "StockMovement" set warehouse_id = 'main-wh' where warehouse_id is null;
alter table "StockMovement" alter column warehouse_id set not null;
alter table "StockMovement" add constraint stockmovement_warehouse_id_fkey
  foreign key (warehouse_id) references "Warehouse"(id);
create index if not exists idx_stockmovement_warehouse_id on "StockMovement"(warehouse_id);

create trigger trg_warehouse_updated before update on "Warehouse" for each row execute function update_updated_at();

-- RLS: same pattern as Category (readable by everyone, writable by admins)
alter table "Warehouse" enable row level security;

create policy "Warehouses: select" on "Warehouse" for select
  using (true);
create policy "Warehouses: insert" on "Warehouse" for insert
  with check (current_user_is_admin());
create policy "Warehouses: update" on "Warehouse" for update
  using (current_user_is_admin());
create policy "Warehouses: delete" on "Warehouse" for delete
  using (current_user_is_admin());
