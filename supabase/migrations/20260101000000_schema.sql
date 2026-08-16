-- ────────────────────────────────────────────────────────────────────────────
-- Nexus CRM — Supabase Schema Migration
-- Converts the Prisma schema to Postgres with enums, indexes, and constraints
-- Run: supabase db push  OR  psql -f this file
-- ────────────────────────────────────────────────────────────────────────────

-- Extensions
create extension if not exists "pgcrypto";

-- ─── Enums ──────────────────────────────────────────────────────────────────

create type user_role as enum ('ADMIN', 'SALES_MANAGER', 'SALES_REP');
create type user_status as enum ('ACTIVE', 'DISABLED');
create type customer_type as enum ('INDIVIDUAL', 'BUSINESS');
create type customer_status as enum ('ACTIVE', 'INACTIVE', 'BLACKLISTED');
create type lead_source as enum ('WEBSITE', 'REFERRAL', 'COLD_CALL', 'EVENT', 'ADS', 'OTHER');
create type lead_stage as enum ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST');
create type lead_status as enum ('OPEN', 'CONVERTED', 'LOST');
create type followup_type as enum ('CALL', 'EMAIL', 'MEETING', 'TASK', 'OTHER');
create type followup_status as enum ('PENDING', 'DONE', 'SKIPPED', 'OVERDUE');
create type followup_priority as enum ('LOW', 'MEDIUM', 'HIGH');
create type product_status as enum ('ACTIVE', 'DISCONTINUED');
create type product_unit as enum ('PCS', 'KG', 'LITER', 'BOX', 'SERVICE');
create type quotation_status as enum ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED');
create type order_status as enum ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');
create type payment_status as enum ('UNPAID', 'PARTIAL', 'PAID', 'OVERPAID');
create type fulfillment_status as enum ('UNFULFILLED', 'PARTIAL', 'FULFILLED');
create type payment_method as enum ('CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'PAYPAL', 'CHECK', 'OTHER');
create type payment_record_status as enum ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');
create type po_status as enum ('DRAFT', 'SENT', 'PARTIAL', 'RECEIVED', 'CANCELLED');
create type call_type as enum ('CALL', 'MESSAGE');
create type call_direction as enum ('INBOUND', 'OUTBOUND');
create type call_status as enum ('COMPLETED', 'MISSED', 'FAILED', 'SCHEDULED');
create type email_status as enum ('SENT', 'DELIVERED', 'OPENED', 'FAILED', 'BOUNCED');
create type activity_action as enum ('CREATE', 'UPDATE', 'DELETE', 'CONVERT', 'STATUS_CHANGE', 'LOGIN', 'LOGOUT');

-- ─── Tables ─────────────────────────────────────────────────────────────────

create table if not exists "User" (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  password_hash text not null,
  role user_role not null default 'SALES_REP',
  status user_status not null default 'ACTIVE',
  avatar_url text,
  phone text,
  job_title text,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists "Customer" (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null,
  email text not null,
  phone text,
  website text,
  address text,
  city text,
  state text,
  country text,
  postal_code text,
  type customer_type not null default 'BUSINESS',
  status customer_status not null default 'ACTIVE',
  industry text,
  annual_revenue numeric(15,2),
  employees integer,
  owner_id uuid not null references "User"(id) on delete restrict,
  notes text,
  tags text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_customer_owner_id on "Customer"(owner_id);
create index if not exists idx_customer_status on "Customer"(status);
create index if not exists idx_customer_company on "Customer"(company);

create table if not exists "Lead" (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null,
  email text not null,
  phone text,
  title text,
  source lead_source not null default 'WEBSITE',
  stage lead_stage not null default 'NEW',
  status lead_status not null default 'OPEN',
  value numeric(15,2) not null default 0,
  currency text not null default 'USD',
  probability integer not null default 0 check (probability >= 0 and probability <= 100),
  owner_id uuid not null references "User"(id) on delete restrict,
  customer_id uuid references "Customer"(id) on delete set null,
  notes text,
  expected_close_date timestamptz,
  converted_at timestamptz,
  lost_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_lead_owner_id on "Lead"(owner_id);
create index if not exists idx_lead_stage on "Lead"(stage);
create index if not exists idx_lead_status on "Lead"(status);
create index if not exists idx_lead_customer_id on "Lead"(customer_id);

create table if not exists "FollowUp" (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type followup_type not null default 'CALL',
  status followup_status not null default 'PENDING',
  priority followup_priority not null default 'MEDIUM',
  due_date timestamptz not null,
  completed_at timestamptz,
  notes text,
  assignee_id uuid not null references "User"(id) on delete restrict,
  customer_id uuid references "Customer"(id) on delete set null,
  lead_id uuid references "Lead"(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_followup_assignee_id on "FollowUp"(assignee_id);
create index if not exists idx_followup_status on "FollowUp"(status);
create index if not exists idx_followup_due_date on "FollowUp"(due_date);

create table if not exists "Product" (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text unique not null,
  description text,
  category text,
  unit product_unit not null default 'PCS',
  price numeric(15,2) not null default 0,
  cost numeric(15,2) not null default 0,
  tax_rate numeric(5,2) not null default 0,
  status product_status not null default 'ACTIVE',
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_product_category on "Product"(category);
create index if not exists idx_product_status on "Product"(status);

create table if not exists "Inventory" (
  id uuid primary key default gen_random_uuid(),
  product_id uuid unique not null references "Product"(id) on delete cascade,
  quantity integer not null default 0,
  reserved integer not null default 0,
  reorder_level integer not null default 10,
  location text,
  last_stock_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_inventory_product_id on "Inventory"(product_id);

create table if not exists "Quotation" (
  id uuid primary key default gen_random_uuid(),
  number text unique not null,
  customer_id uuid not null references "Customer"(id) on delete restrict,
  lead_id uuid references "Lead"(id) on delete set null,
  owner_id uuid not null references "User"(id) on delete restrict,
  status quotation_status not null default 'DRAFT',
  subject text not null,
  subtotal numeric(15,2) not null default 0,
  tax_rate numeric(5,2) not null default 0,
  tax_amount numeric(15,2) not null default 0,
  discount numeric(5,2) not null default 0,
  total numeric(15,2) not null default 0,
  currency text not null default 'USD',
  valid_until timestamptz,
  sent_at timestamptz,
  accepted_at timestamptz,
  notes text,
  terms text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_quotation_customer_id on "Quotation"(customer_id);
create index if not exists idx_quotation_owner_id on "Quotation"(owner_id);
create index if not exists idx_quotation_status on "Quotation"(status);

create table if not exists "QuotationItem" (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references "Quotation"(id) on delete cascade,
  product_id uuid references "Product"(id) on delete set null,
  description text not null,
  qty numeric(15,2) not null default 1,
  unit_price numeric(15,2) not null default 0,
  discount numeric(5,2) not null default 0,
  tax_rate numeric(5,2) not null default 0,
  total numeric(15,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_quotation_item_quotation_id on "QuotationItem"(quotation_id);

create table if not exists "Order" (
  id uuid primary key default gen_random_uuid(),
  number text unique not null,
  customer_id uuid not null references "Customer"(id) on delete restrict,
  quotation_id uuid unique references "Quotation"(id) on delete set null,
  owner_id uuid not null references "User"(id) on delete restrict,
  status order_status not null default 'PENDING',
  payment_status payment_status not null default 'UNPAID',
  fulfillment_status fulfillment_status not null default 'UNFULFILLED',
  subtotal numeric(15,2) not null default 0,
  tax_rate numeric(5,2) not null default 0,
  tax_amount numeric(15,2) not null default 0,
  discount numeric(5,2) not null default 0,
  shipping numeric(15,2) not null default 0,
  total numeric(15,2) not null default 0,
  paid_amount numeric(15,2) not null default 0,
  currency text not null default 'USD',
  order_date timestamptz not null default now(),
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  notes text,
  shipping_address text,
  billing_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_order_customer_id on "Order"(customer_id);
create index if not exists idx_order_owner_id on "Order"(owner_id);
create index if not exists idx_order_status on "Order"(status);
create index if not exists idx_order_payment_status on "Order"(payment_status);

create table if not exists "OrderItem" (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references "Order"(id) on delete cascade,
  product_id uuid references "Product"(id) on delete set null,
  description text not null,
  qty numeric(15,2) not null default 1,
  unit_price numeric(15,2) not null default 0,
  discount numeric(5,2) not null default 0,
  tax_rate numeric(5,2) not null default 0,
  total numeric(15,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_order_item_order_id on "OrderItem"(order_id);

create table if not exists "Payment" (
  id uuid primary key default gen_random_uuid(),
  number text unique not null,
  order_id uuid not null references "Order"(id) on delete restrict,
  customer_id uuid not null references "Customer"(id) on delete restrict,
  owner_id uuid not null references "User"(id) on delete restrict,
  amount numeric(15,2) not null,
  currency text not null default 'USD',
  method payment_method not null default 'BANK_TRANSFER',
  status payment_record_status not null default 'PENDING',
  reference text,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_payment_order_id on "Payment"(order_id);
create index if not exists idx_payment_customer_id on "Payment"(customer_id);
create index if not exists idx_payment_status on "Payment"(status);

create table if not exists "PurchaseOrder" (
  id uuid primary key default gen_random_uuid(),
  number text unique not null,
  supplier text not null,
  supplier_email text,
  supplier_phone text,
  owner_id uuid not null references "User"(id) on delete restrict,
  status po_status not null default 'DRAFT',
  subtotal numeric(15,2) not null default 0,
  tax_amount numeric(15,2) not null default 0,
  total numeric(15,2) not null default 0,
  currency text not null default 'USD',
  expected_date timestamptz,
  received_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_po_owner_id on "PurchaseOrder"(owner_id);
create index if not exists idx_po_status on "PurchaseOrder"(status);

create table if not exists "PurchaseOrderItem" (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references "PurchaseOrder"(id) on delete cascade,
  product_id uuid references "Product"(id) on delete set null,
  description text not null,
  qty numeric(15,2) not null default 1,
  unit_price numeric(15,2) not null default 0,
  total numeric(15,2) not null default 0,
  received_qty numeric(15,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_po_item_po_id on "PurchaseOrderItem"(purchase_order_id);

create table if not exists "Call" (
  id uuid primary key default gen_random_uuid(),
  type call_type not null default 'CALL',
  direction call_direction not null default 'OUTBOUND',
  status call_status not null default 'COMPLETED',
  duration integer not null default 0,
  subject text,
  notes text,
  customer_id uuid references "Customer"(id) on delete set null,
  lead_id uuid references "Lead"(id) on delete set null,
  user_id uuid not null references "User"(id) on delete restrict,
  started_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_call_customer_id on "Call"(customer_id);
create index if not exists idx_call_lead_id on "Call"(lead_id);
create index if not exists idx_call_user_id on "Call"(user_id);

create table if not exists "EmailLog" (
  id uuid primary key default gen_random_uuid(),
  "to" text not null,
  "from" text not null,
  cc text,
  bcc text,
  subject text not null,
  body text not null,
  status email_status not null default 'SENT',
  customer_id uuid references "Customer"(id) on delete set null,
  lead_id uuid references "Lead"(id) on delete set null,
  user_id uuid not null references "User"(id) on delete restrict,
  sent_at timestamptz not null default now(),
  opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_email_customer_id on "EmailLog"(customer_id);
create index if not exists idx_email_user_id on "EmailLog"(user_id);

create table if not exists "ActivityLog" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references "User"(id) on delete restrict,
  action activity_action not null,
  entity text not null,
  entity_id text not null,
  entity_name text,
  summary text not null,
  metadata jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists idx_activity_user_id on "ActivityLog"(user_id);
create index if not exists idx_activity_entity on "ActivityLog"(entity);
create index if not exists idx_activity_entity_id on "ActivityLog"(entity_id);
create index if not exists idx_activity_created_at on "ActivityLog"(created_at desc);

create table if not exists "Setting" (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value text not null,
  category text not null default 'GENERAL',
  updated_at timestamptz not null default now(),
  updated_by uuid references "User"(id) on delete set null
);

-- ─── Updated_at triggers ────────────────────────────────────────────────────

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_user_updated before update on "User" for each row execute function update_updated_at();
create trigger trg_customer_updated before update on "Customer" for each row execute function update_updated_at();
create trigger trg_lead_updated before update on "Lead" for each row execute function update_updated_at();
create trigger trg_followup_updated before update on "FollowUp" for each row execute function update_updated_at();
create trigger trg_product_updated before update on "Product" for each row execute function update_updated_at();
create trigger trg_inventory_updated before update on "Inventory" for each row execute function update_updated_at();
create trigger trg_quotation_updated before update on "Quotation" for each row execute function update_updated_at();
create trigger trg_order_updated before update on "Order" for each row execute function update_updated_at();
create trigger trg_payment_updated before update on "Payment" for each row execute function update_updated_at();
create trigger trg_po_updated before update on "PurchaseOrder" for each row execute function update_updated_at();
create trigger trg_call_updated before update on "Call" for each row execute function update_updated_at();
create trigger trg_email_updated before update on "EmailLog" for each row execute function update_updated_at();
create trigger trg_setting_updated before update on "Setting" for each row execute function update_updated_at();
