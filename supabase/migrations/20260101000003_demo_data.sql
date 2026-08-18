-- ────────────────────────────────────────────────────────────────────────────
-- Nexus CRM — Demo / seed data
-- Paste this whole file into Supabase Dashboard → SQL Editor → Run.
-- Run 20260101000002_fix_enum_text_mismatch.sql FIRST (or make sure the
-- columns below are already `text`, not custom enums) or these inserts will
-- fail on the enum casts.
--
-- Safe to re-run: Users/Products/Quotations/Orders/Payments use ON CONFLICT
-- DO NOTHING on their unique columns. Customers/Leads/FollowUps don't have a
-- natural unique key in this schema, so re-running this script will insert a
-- second copy of those — run it once.
-- ────────────────────────────────────────────────────────────────────────────

-- ─── Users ────────────────────────────────────────────────────────────────
-- Demo login credentials (email / password):
--   admin@nexuscrm.io    / admin123    (ADMIN)
--   manager@nexuscrm.io  / manager123  (SALES_MANAGER)
--   rep@nexuscrm.io      / rep123      (SALES_REP)
--   casey.rep@nexuscrm.io/ rep123      (SALES_REP)
--   morgan.rep@nexuscrm.io/rep123      (SALES_REP)
-- Hashes below are real bcrypt (cost 10) hashes of the passwords above,
-- verified with bcryptjs — the same library src/lib/auth.ts uses.

insert into "User" (id, email, name, password_hash, role, status, job_title, phone)
values
  (gen_random_uuid()::text, 'admin@nexuscrm.io',      'Alex Morgan',   '$2b$10$MoE.cwZJlQD9Kwl5zFIh2uvcr3XAir3Pzo7KXxCa0emorEYVWq7R2', 'ADMIN',         'ACTIVE', 'System Administrator',  '+1-555-0100'),
  (gen_random_uuid()::text, 'manager@nexuscrm.io',    'Sam Chen',      '$2b$10$T6VU0yQ/is0NLPG9wu46WuraiEQH8rTWI/MbsjltoCghzGM1/fOYS', 'SALES_MANAGER', 'ACTIVE', 'Sales Manager',         '+1-555-0101'),
  (gen_random_uuid()::text, 'rep@nexuscrm.io',        'Jordan Patel',  '$2b$10$1rNTE7rnESB66Pf9Oi34h.HVuIG04dXeMq4DSifP9bjFZkrcNwvdS', 'SALES_REP',     'ACTIVE', 'Account Executive',     '+1-555-0102'),
  (gen_random_uuid()::text, 'casey.rep@nexuscrm.io',  'Casey Reyes',   '$2b$10$1rNTE7rnESB66Pf9Oi34h.HVuIG04dXeMq4DSifP9bjFZkrcNwvdS', 'SALES_REP',     'ACTIVE', 'Sales Development Rep', '+1-555-0103'),
  (gen_random_uuid()::text, 'morgan.rep@nexuscrm.io', 'Morgan Lee',    '$2b$10$1rNTE7rnESB66Pf9Oi34h.HVuIG04dXeMq4DSifP9bjFZkrcNwvdS', 'SALES_REP',     'ACTIVE', 'Account Executive',     '+1-555-0104')
on conflict (email) do nothing;

-- ─── Products + Inventory ───────────────────────────────────────────────────

insert into "Product" (id, name, sku, category, unit, price, cost, tax_rate, status)
values
  (gen_random_uuid()::text, 'Nexus Pro License',          'NX-PRO-001',  'Software', 'PCS',     1499, 350,  10, 'ACTIVE'),
  (gen_random_uuid()::text, 'Nexus Enterprise License',   'NX-ENT-001',  'Software', 'PCS',     4999, 1100, 10, 'ACTIVE'),
  (gen_random_uuid()::text, 'Premium Support Plan',       'SUP-PRE-001', 'Service',  'SERVICE', 999,  200,  5,  'ACTIVE'),
  (gen_random_uuid()::text, 'Onboarding Package',         'ONB-PKG-001', 'Service',  'SERVICE', 2499, 800,  5,  'ACTIVE'),
  (gen_random_uuid()::text, 'API Calls Pack (100K)',      'API-100K',    'Service',  'PCS',     499,  50,   10, 'ACTIVE'),
  (gen_random_uuid()::text, 'Storage Upgrade (1TB)',      'STO-1TB',     'Service',  'PCS',     299,  80,   10, 'ACTIVE'),
  (gen_random_uuid()::text, 'Custom Integration',         'INT-CUS-001', 'Service',  'SERVICE', 3500, 1200, 5,  'ACTIVE'),
  (gen_random_uuid()::text, 'Training Session (Full Day)','TRN-FD-001',  'Service',  'SERVICE', 1499, 400,  5,  'ACTIVE'),
  (gen_random_uuid()::text, 'Nexus Mobile App',           'APP-MOB-001', 'Software', 'PCS',     499,  100,  10, 'ACTIVE'),
  (gen_random_uuid()::text, 'Analytics Add-on',           'ADD-ANA-001', 'Software', 'PCS',     799,  180,  10, 'ACTIVE')
on conflict (sku) do nothing;

insert into "Inventory" (id, product_id, quantity, reserved, reorder_level, location)
select gen_random_uuid()::text, p.id, (20 + (random()*60)::int), (random()*5)::int, 10,
       (array['Warehouse A','Warehouse B','Warehouse C'])[1 + (random()*2)::int]
from "Product" p
where not exists (select 1 from "Inventory" i where i.product_id = p.id);

-- ─── Customers ───────────────────────────────────────────────────────────

insert into "Customer" (id, name, company, email, phone, website, city, state, country, postal_code, type, status, industry, annual_revenue, employees, owner_id)
select gen_random_uuid()::text, v.name, v.company, v.email, v.phone, v.website, v.city, v.state, v.country, v.postal_code, 'BUSINESS', v.status, v.industry, v.revenue, v.employees,
       (select id from "User" where email = v.owner_email)
from (values
  ('Priya Sharma',  'Acme Corp',            'priya.sharma@acmecorp.com',      '+1-555-201', 'https://acmecorp.com',        'New York',     'NY', 'USA', '10001', 'ACTIVE',   'Technology',   4200000,  250,  'rep@nexuscrm.io'),
  ('Liam Carter',   'Globex Inc',           'liam.carter@globexinc.com',      '+1-555-202', 'https://globexinc.com',       'San Francisco','CA', 'USA', '94103', 'ACTIVE',   'Finance',      8100000,  500,  'casey.rep@nexuscrm.io'),
  ('Noah Bennett',  'Stark Industries',     'noah.bennett@starkindustries.com','+1-555-203','https://starkindustries.com', 'Austin',       'TX', 'USA', '73301', 'ACTIVE',   'Manufacturing',25000000, 1000, 'morgan.rep@nexuscrm.io'),
  ('Emma Hughes',   'Wayne Enterprises',    'emma.hughes@wayneenterprises.com','+1-555-204','https://wayneenterprises.com','Boston',       'MA', 'USA', '02108', 'ACTIVE',   'Real Estate',  15500000, 800,  'manager@nexuscrm.io'),
  ('Sophia Patel',  'Initech',              'sophia.patel@initech.com',       '+1-555-205', 'https://initech.com',         'Chicago',      'IL', 'USA', '60601', 'INACTIVE', 'Retail',       1200000,  50,   'rep@nexuscrm.io'),
  ('Ethan Nguyen',  'Hooli',                'ethan.nguyen@hooli.com',         '+1-555-206', 'https://hooli.com',           'Seattle',      'WA', 'USA', '98101', 'ACTIVE',   'Technology',   9800000,  600,  'casey.rep@nexuscrm.io'),
  ('Ava Cohen',     'Vandelay Industries',  'ava.cohen@vandelayindustries.com','+1-555-207','https://vandelayindustries.com','London',     '',   'UK',  'EC1A1',  'ACTIVE',   'Logistics',    3300000,  120,  'morgan.rep@nexuscrm.io'),
  ('Lucas Reyes',   'Pied Piper',           'lucas.reyes@piedpiper.com',      '+1-555-208', 'https://piedpiper.com',       'Berlin',       '',   'Germany','10115', 'ACTIVE',  'Technology',   2100000,  40,   'manager@nexuscrm.io')
) as v(name, company, email, phone, website, city, state, country, postal_code, status, industry, revenue, employees, owner_email)
where not exists (select 1 from "Customer" c where c.email = v.email);

-- ─── Leads ───────────────────────────────────────────────────────────────

insert into "Lead" (id, name, company, email, phone, source, stage, status, value, currency, probability, owner_id)
select gen_random_uuid()::text, v.name, v.company, v.email, v.phone, v.source, v.stage, v.status, v.value, 'USD', v.probability,
       (select id from "User" where email = v.owner_email)
from (values
  ('Maya Silva',    'Umbrella Co',        'maya.silva@umbrellaco.com',      '+1-555-301', 'WEBSITE',   'NEW',         'OPEN',      12000, 20,  'rep@nexuscrm.io'),
  ('Oliver Kim',    'Cyberdyne Systems',  'oliver.kim@cyberdynesys.com',    '+1-555-302', 'REFERRAL',  'CONTACTED',   'OPEN',      8500,  35,  'casey.rep@nexuscrm.io'),
  ('Isabella Wong', 'Massive Dynamic',    'isabella.wong@massivedynamic.com','+1-555-303','COLD_CALL', 'QUALIFIED',   'OPEN',      21000, 50,  'morgan.rep@nexuscrm.io'),
  ('James Dubois',  'Aperture Science',   'james.dubois@aperturescience.com','+1-555-304','EVENT',     'PROPOSAL',    'OPEN',      45000, 65,  'manager@nexuscrm.io'),
  ('Charlotte Rossi','Black Mesa',        'charlotte.rossi@blackmesa.com',  '+1-555-305', 'ADS',       'NEGOTIATION', 'OPEN',      31000, 80,  'rep@nexuscrm.io'),
  ('Benjamin Okafor','Wonka Industries',  'benjamin.okafor@wonkaindustries.com','+1-555-306','WEBSITE','WON',         'CONVERTED', 18000, 100, 'casey.rep@nexuscrm.io'),
  ('Amelia Larsen', 'Nakatomi Trading',   'amelia.larsen@nakatomitrading.com','+1-555-307','REFERRAL', 'LOST',        'LOST',      9000,  0,   'morgan.rep@nexuscrm.io'),
  ('Henry Mendoza',  'Soylent Foods',     'henry.mendoza@soylentfoods.com', '+1-555-308', 'OTHER',     'NEW',         'OPEN',      6000,  15,  'manager@nexuscrm.io')
) as v(name, company, email, phone, source, stage, status, value, probability, owner_email)
where not exists (select 1 from "Lead" l where l.email = v.email);

-- ─── Follow-ups ────────────────────────────────────────────────────────────

insert into "FollowUp" (id, title, type, status, priority, due_date, assignee_id, customer_id)
select gen_random_uuid()::text, v.title, v.type, v.status, v.priority, now() + (v.days_offset || ' days')::interval,
       (select id from "User" where email = v.assignee_email),
       (select id from "Customer" where email = v.customer_email)
from (values
  ('Follow up on renewal quote',   'CALL',    'PENDING', 'HIGH',   2,  'rep@nexuscrm.io',       'priya.sharma@acmecorp.com'),
  ('Send onboarding materials',    'EMAIL',   'PENDING', 'MEDIUM', 1,  'casey.rep@nexuscrm.io', 'liam.carter@globexinc.com'),
  ('Quarterly business review',    'MEETING', 'PENDING', 'HIGH',   5,  'morgan.rep@nexuscrm.io','noah.bennett@starkindustries.com'),
  ('Check in on support ticket',   'TASK',    'PENDING', 'LOW',    3,  'manager@nexuscrm.io',   'emma.hughes@wayneenterprises.com'),
  ('Re-engagement call',           'CALL',    'PENDING', 'MEDIUM', 7,  'rep@nexuscrm.io',       'sophia.patel@initech.com')
) as v(title, type, status, priority, days_offset, assignee_email, customer_email);

-- ─── Quotations + items ────────────────────────────────────────────────────

with q as (
  insert into "Quotation" (id, number, customer_id, owner_id, status, subject, subtotal, tax_rate, tax_amount, total, currency, valid_until)
  select gen_random_uuid()::text, 'QT-2026-0001',
         (select id from "Customer" where email = 'priya.sharma@acmecorp.com'),
         (select id from "User" where email = 'rep@nexuscrm.io'),
         'SENT', 'Nexus Pro renewal + support', 2498, 10, 249.80, 2747.80, 'USD', now() + interval '30 days'
  on conflict (number) do nothing
  returning id
)
insert into "QuotationItem" (id, quotation_id, product_id, description, qty, unit_price, tax_rate, total)
select gen_random_uuid()::text, q.id, p.id, p.name, 1, p.price, p.tax_rate, p.price
from q, "Product" p where p.sku in ('NX-PRO-001', 'SUP-PRE-001');

-- ─── Orders + items + payment ──────────────────────────────────────────────

with o as (
  insert into "Order" (id, number, customer_id, owner_id, status, payment_status, fulfillment_status, subtotal, tax_rate, tax_amount, total, paid_amount, currency)
  select gen_random_uuid()::text, 'ORD-2026-0001',
         (select id from "Customer" where email = 'liam.carter@globexinc.com'),
         (select id from "User" where email = 'casey.rep@nexuscrm.io'),
         'CONFIRMED', 'PAID', 'FULFILLED', 4999, 10, 499.90, 5498.90, 5498.90, 'USD'
  on conflict (number) do nothing
  returning id
)
insert into "OrderItem" (id, order_id, product_id, description, qty, unit_price, tax_rate, total)
select gen_random_uuid()::text, o.id, p.id, p.name, 1, p.price, p.tax_rate, p.price
from o, "Product" p where p.sku = 'NX-ENT-001';

insert into "Payment" (id, number, order_id, customer_id, owner_id, amount, currency, method, status, paid_at)
select gen_random_uuid()::text, 'PAY-2026-0001', o.id,
       (select id from "Customer" where email = 'liam.carter@globexinc.com'),
       (select id from "User" where email = 'casey.rep@nexuscrm.io'),
       5498.90, 'USD', 'BANK_TRANSFER', 'COMPLETED', now()
from "Order" o where o.number = 'ORD-2026-0001'
on conflict (number) do nothing;

-- ─── Done ───────────────────────────────────────────────────────────────
select
  (select count(*) from "User") as users,
  (select count(*) from "Product") as products,
  (select count(*) from "Customer") as customers,
  (select count(*) from "Lead") as leads,
  (select count(*) from "FollowUp") as followups,
  (select count(*) from "Quotation") as quotations,
  (select count(*) from "Order") as orders,
  (select count(*) from "Payment") as payments;
