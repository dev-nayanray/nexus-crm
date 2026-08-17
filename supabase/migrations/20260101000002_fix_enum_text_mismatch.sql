-- ────────────────────────────────────────────────────────────────────────────
-- Fix: Prisma P2032 "Error converting field X of expected non-nullable type
-- String, found incompatible value" on every status/type/category column.
--
-- Root cause: this schema (20260101000000_schema.sql) created native Postgres
-- ENUM types for every status/category field, but prisma/schema.prisma models
-- every one of them as a plain `String`. Prisma's query engine builds its
-- result decoding based on the schema's declared type (String / Postgres
-- text OID) — when the database actually returns a custom enum type's OID
-- instead, decoding fails with P2032. This first broke login (User.role),
-- but every other enum-typed column below will fail identically the first
-- time the app queries it (Customer.status, Lead.stage, Order.status, etc).
--
-- Fix: convert every enum-typed column to `text`, matching what Prisma
-- already expects. `USING col::text` is a lossless, non-destructive cast —
-- enum labels and their text representation are identical strings, so no
-- data changes, only the column's declared type.
-- ────────────────────────────────────────────────────────────────────────────

alter table "User"            alter column role              type text using role::text,
                               alter column role              set default 'SALES_REP';
alter table "User"            alter column status             type text using status::text,
                               alter column status             set default 'ACTIVE';

alter table "Customer"        alter column type                type text using type::text,
                               alter column type                set default 'BUSINESS';
alter table "Customer"        alter column status              type text using status::text,
                               alter column status              set default 'ACTIVE';

alter table "Lead"            alter column source              type text using source::text,
                               alter column source              set default 'WEBSITE';
alter table "Lead"            alter column stage               type text using stage::text,
                               alter column stage               set default 'NEW';
alter table "Lead"            alter column status              type text using status::text,
                               alter column status              set default 'OPEN';

alter table "FollowUp"        alter column type                type text using type::text,
                               alter column type                set default 'CALL';
alter table "FollowUp"        alter column status              type text using status::text,
                               alter column status              set default 'PENDING';
alter table "FollowUp"        alter column priority            type text using priority::text,
                               alter column priority            set default 'MEDIUM';

alter table "Product"         alter column unit                type text using unit::text,
                               alter column unit                set default 'PCS';
alter table "Product"         alter column status              type text using status::text,
                               alter column status              set default 'ACTIVE';

alter table "Quotation"       alter column status              type text using status::text,
                               alter column status              set default 'DRAFT';

alter table "Order"           alter column status              type text using status::text,
                               alter column status              set default 'PENDING';
alter table "Order"           alter column payment_status      type text using payment_status::text,
                               alter column payment_status      set default 'UNPAID';
alter table "Order"           alter column fulfillment_status  type text using fulfillment_status::text,
                               alter column fulfillment_status  set default 'UNFULFILLED';

alter table "Payment"         alter column method               type text using method::text,
                               alter column method               set default 'BANK_TRANSFER';
alter table "Payment"         alter column status               type text using status::text,
                               alter column status               set default 'PENDING';

alter table "PurchaseOrder"   alter column status               type text using status::text,
                               alter column status               set default 'DRAFT';

alter table "Call"            alter column type                 type text using type::text,
                               alter column type                 set default 'CALL';
alter table "Call"            alter column direction             type text using direction::text,
                               alter column direction             set default 'OUTBOUND';
alter table "Call"            alter column status               type text using status::text,
                               alter column status               set default 'COMPLETED';

alter table "EmailLog"        alter column status               type text using status::text,
                               alter column status               set default 'SENT';

alter table "ActivityLog"     alter column action               type text using action::text;

-- The custom enum types above are now unused (every column that referenced
-- them was converted to text). They're left in place rather than dropped —
-- harmless to keep, and dropping is riskier than necessary for this fix.
