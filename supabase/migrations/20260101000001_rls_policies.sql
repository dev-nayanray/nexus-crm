-- ────────────────────────────────────────────────────────────────────────────
-- Nexus CRM — Row Level Security (RLS) Policies
-- Matches the role system: ADMIN (full), SALES_MANAGER (all data), SALES_REP (own data only)
-- ────────────────────────────────────────────────────────────────────────────

-- Enable RLS on all tables
alter table "Customer" enable row level security;
alter table "Lead" enable row level security;
alter table "FollowUp" enable row level security;
alter table "Quotation" enable row level security;
alter table "QuotationItem" enable row level security;
alter table "Order" enable row level security;
alter table "OrderItem" enable row level security;
alter table "Payment" enable row level security;
alter table "Product" enable row level security;
alter table "Inventory" enable row level security;
alter table "PurchaseOrder" enable row level security;
alter table "PurchaseOrderItem" enable row level security;
alter table "Call" enable row level security;
alter table "EmailLog" enable row level security;
alter table "ActivityLog" enable row level security;
alter table "Setting" enable row level security;
alter table "User" enable row level security;

-- Helper function: get current user's role from auth.uid()
-- Assumes auth.users() maps to "User".id via a custom claim or join.
create or replace function current_user_role()
returns text as $$
  select role::text from "User" where id = auth.uid()::text;
$$ language sql security definer stable;

create or replace function current_user_is_admin()
returns boolean as $$
  select exists(select 1 from "User" where id = auth.uid()::text and role = 'ADMIN');
$$ language sql security definer stable;

create or replace function current_user_is_manager_or_above()
returns boolean as $$
  select exists(
    select 1 from "User"
    where id = auth.uid()::text and role in ('ADMIN', 'SALES_MANAGER')
  );
$$ language sql security definer stable;

-- ─── Customer policies ──────────────────────────────────────────────────────
-- Reps: see/edit only their own customers. Managers+Admins: all.
create policy "Customers: select" on "Customer" for select
  using (owner_id = auth.uid()::text or current_user_is_manager_or_above());
create policy "Customers: insert" on "Customer" for insert
  with check (owner_id = auth.uid()::text or current_user_is_manager_or_above());
create policy "Customers: update" on "Customer" for update
  using (owner_id = auth.uid()::text or current_user_is_manager_or_above());
create policy "Customers: delete" on "Customer" for delete
  using (current_user_is_manager_or_above());

-- ─── Lead policies ──────────────────────────────────────────────────────────
create policy "Leads: select" on "Lead" for select
  using (owner_id = auth.uid()::text or current_user_is_manager_or_above());
create policy "Leads: insert" on "Lead" for insert
  with check (owner_id = auth.uid()::text or current_user_is_manager_or_above());
create policy "Leads: update" on "Lead" for update
  using (owner_id = auth.uid()::text or current_user_is_manager_or_above());
create policy "Leads: delete" on "Lead" for delete
  using (current_user_is_manager_or_above());

-- ─── FollowUp policies (uses assignee_id, not owner_id) ─────────────────────
create policy "FollowUps: select" on "FollowUp" for select
  using (assignee_id = auth.uid()::text or current_user_is_manager_or_above());
create policy "FollowUps: insert" on "FollowUp" for insert
  with check (assignee_id = auth.uid()::text or current_user_is_manager_or_above());
create policy "FollowUps: update" on "FollowUp" for update
  using (assignee_id = auth.uid()::text or current_user_is_manager_or_above());
create policy "FollowUps: delete" on "FollowUp" for delete
  using (current_user_is_manager_or_above());

-- ─── Quotation policies ─────────────────────────────────────────────────────
create policy "Quotations: select" on "Quotation" for select
  using (owner_id = auth.uid()::text or current_user_is_manager_or_above());
create policy "Quotations: insert" on "Quotation" for insert
  with check (owner_id = auth.uid()::text or current_user_is_manager_or_above());
create policy "Quotations: update" on "Quotation" for update
  using (owner_id = auth.uid()::text or current_user_is_manager_or_above());
create policy "Quotations: delete" on "Quotation" for delete
  using (current_user_is_manager_or_above());

-- QuotationItem: inherits via quotation_id join
create policy "QuotationItems: select" on "QuotationItem" for select
  using (exists(select 1 from "Quotation" q where q.id = quotation_id and (q.owner_id = auth.uid()::text or current_user_is_manager_or_above())));
create policy "QuotationItems: insert" on "QuotationItem" for insert
  with check (exists(select 1 from "Quotation" q where q.id = quotation_id and (q.owner_id = auth.uid()::text or current_user_is_manager_or_above())));
create policy "QuotationItems: update" on "QuotationItem" for update
  using (exists(select 1 from "Quotation" q where q.id = quotation_id and (q.owner_id = auth.uid()::text or current_user_is_manager_or_above())));
create policy "QuotationItems: delete" on "QuotationItem" for delete
  using (exists(select 1 from "Quotation" q where q.id = quotation_id and current_user_is_manager_or_above()));

-- ─── Order policies ─────────────────────────────────────────────────────────
create policy "Orders: select" on "Order" for select
  using (owner_id = auth.uid()::text or current_user_is_manager_or_above());
create policy "Orders: insert" on "Order" for insert
  with check (owner_id = auth.uid()::text or current_user_is_manager_or_above());
create policy "Orders: update" on "Order" for update
  using (owner_id = auth.uid()::text or current_user_is_manager_or_above());
create policy "Orders: delete" on "Order" for delete
  using (current_user_is_manager_or_above());

-- OrderItem: inherits via order_id join
create policy "OrderItems: select" on "OrderItem" for select
  using (exists(select 1 from "Order" o where o.id = order_id and (o.owner_id = auth.uid()::text or current_user_is_manager_or_above())));
create policy "OrderItems: insert" on "OrderItem" for insert
  with check (exists(select 1 from "Order" o where o.id = order_id and (o.owner_id = auth.uid()::text or current_user_is_manager_or_above())));
create policy "OrderItems: update" on "OrderItem" for update
  using (exists(select 1 from "Order" o where o.id = order_id and (o.owner_id = auth.uid()::text or current_user_is_manager_or_above())));
create policy "OrderItems: delete" on "OrderItem" for delete
  using (exists(select 1 from "Order" o where o.id = order_id and current_user_is_manager_or_above()));

-- ─── Payment policies ───────────────────────────────────────────────────────
create policy "Payments: select" on "Payment" for select
  using (owner_id = auth.uid()::text or current_user_is_manager_or_above());
create policy "Payments: insert" on "Payment" for insert
  with check (owner_id = auth.uid()::text or current_user_is_manager_or_above());
create policy "Payments: update" on "Payment" for update
  using (owner_id = auth.uid()::text or current_user_is_manager_or_above());
create policy "Payments: delete" on "Payment" for delete
  using (current_user_is_manager_or_above());

-- ─── PurchaseOrder policies (managers+admins only) ──────────────────────────
create policy "POs: select" on "PurchaseOrder" for select
  using (current_user_is_manager_or_above());
create policy "POs: insert" on "PurchaseOrder" for insert
  with check (current_user_is_manager_or_above());
create policy "POs: update" on "PurchaseOrder" for update
  using (current_user_is_manager_or_above());
create policy "POs: delete" on "PurchaseOrder" for delete
  using (current_user_is_manager_or_above());

create policy "POItems: select" on "PurchaseOrderItem" for select
  using (current_user_is_manager_or_above());
create policy "POItems: insert" on "PurchaseOrderItem" for insert
  with check (current_user_is_manager_or_above());
create policy "POItems: update" on "PurchaseOrderItem" for update
  using (current_user_is_manager_or_above());
create policy "POItems: delete" on "PurchaseOrderItem" for delete
  using (current_user_is_manager_or_above());

-- ─── Product policies (read: all authenticated; write: admins) ──────────────
create policy "Products: select" on "Product" for select
  using (true);  -- all authenticated users can read products
create policy "Products: insert" on "Product" for insert
  with check (current_user_is_admin());
create policy "Products: update" on "Product" for update
  using (current_user_is_admin());
create policy "Products: delete" on "Product" for delete
  using (current_user_is_admin());

-- ─── Inventory policies (read: managers; write: admins) ─────────────────────
create policy "Inventory: select" on "Inventory" for select
  using (current_user_is_manager_or_above());
create policy "Inventory: insert" on "Inventory" for insert
  with check (current_user_is_admin());
create policy "Inventory: update" on "Inventory" for update
  using (current_user_is_admin());
create policy "Inventory: delete" on "Inventory" for delete
  using (current_user_is_admin());

-- ─── Call policies ──────────────────────────────────────────────────────────
create policy "Calls: select" on "Call" for select
  using (user_id = auth.uid()::text or current_user_is_manager_or_above());
create policy "Calls: insert" on "Call" for insert
  with check (user_id = auth.uid()::text or current_user_is_manager_or_above());
create policy "Calls: update" on "Call" for update
  using (user_id = auth.uid()::text or current_user_is_manager_or_above());
create policy "Calls: delete" on "Call" for delete
  using (current_user_is_manager_or_above());

-- ─── EmailLog policies ──────────────────────────────────────────────────────
create policy "Emails: select" on "EmailLog" for select
  using (user_id = auth.uid()::text or current_user_is_manager_or_above());
create policy "Emails: insert" on "EmailLog" for insert
  with check (user_id = auth.uid()::text or current_user_is_manager_or_above());
create policy "Emails: update" on "EmailLog" for update
  using (user_id = auth.uid()::text or current_user_is_manager_or_above());
create policy "Emails: delete" on "EmailLog" for delete
  using (current_user_is_manager_or_above());

-- ─── ActivityLog policies (managers+admins only) ────────────────────────────
create policy "ActivityLogs: select" on "ActivityLog" for select
  using (user_id = auth.uid()::text or current_user_is_manager_or_above());
create policy "ActivityLogs: insert" on "ActivityLog" for insert
  with check (true);  -- any authenticated user can create log entries
create policy "ActivityLogs: update" on "ActivityLog" for update
  using (current_user_is_admin());
create policy "ActivityLogs: delete" on "ActivityLog" for delete
  using (current_user_is_admin());

-- ─── User policies (admins only) ────────────────────────────────────────────
create policy "Users: select" on "User" for select
  using (id = auth.uid()::text or current_user_is_manager_or_above());
create policy "Users: insert" on "User" for insert
  with check (current_user_is_admin());
create policy "Users: update" on "User" for update
  using (id = auth.uid()::text or current_user_is_admin());
create policy "Users: delete" on "User" for delete
  using (current_user_is_admin());

-- ─── Setting policies (read: all; write: admins) ───────────────────────────
create policy "Settings: select" on "Setting" for select
  using (true);
create policy "Settings: insert" on "Setting" for insert
  with check (current_user_is_admin());
create policy "Settings: update" on "Setting" for update
  using (current_user_is_admin());
create policy "Settings: delete" on "Setting" for delete
  using (current_user_is_admin());

-- ─── Realtime ───────────────────────────────────────────────────────────────
-- Enable realtime on key tables for live updates
alter publication supabase_realtime add table "Customer";
alter publication supabase_realtime add table "Lead";
alter publication supabase_realtime add table "Order";
alter publication supabase_realtime add table "Quotation";
alter publication supabase_realtime add table "Payment";
alter publication supabase_realtime add table "FollowUp";
alter publication supabase_realtime add table "ActivityLog";
alter publication supabase_realtime add table "Inventory";
