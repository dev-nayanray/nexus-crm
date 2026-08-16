# Nexus CRM — Supabase Migration Guide

This folder contains SQL migrations and RLS policies to deploy Nexus CRM to **Supabase Postgres** instead of local SQLite.

## Files

```
supabase/
├── config.toml                              # Supabase project config
├── migrations/
│   ├── 20260101000000_schema.sql           # All tables, enums, indexes, triggers
│   └── 20260101000001_rls_policies.sql     # Row Level Security policies per role
└── README.md                                # This file
```

## Role-Based Access Control (RBAC)

The RLS policies implement the same 3-tier role system used in the Next.js app:

| Role | Data Scope | Can Manage Users | Can Manage Products/Inventory | Can View Reports |
|------|------------|------------------|-------------------------------|------------------|
| **ADMIN** | All data | ✅ | ✅ | ✅ |
| **SALES_MANAGER** | All sales data (team scope) | ❌ | ❌ (read-only) | ✅ |
| **SALES_REP** | Own data only (`owner_id = auth.uid()`) | ❌ | ❌ (read-only) | ❌ |

### Policy Pattern

Each table has 4 policies (SELECT/INSERT/UPDATE/DELETE):

```sql
-- Example: Customer policies
create policy "Customers: select" on "Customer" for select
  using (owner_id = auth.uid() or current_user_is_manager_or_above());

create policy "Customers: delete" on "Customer" for delete
  using (current_user_is_manager_or_above());
```

### Special Cases

- **Products**: all authenticated users can READ (catalog is shared), but only admins can write
- **Inventory**: managers+admins can read; only admins can write
- **ActivityLog**: any authenticated user can INSERT (audit trail); only managers+ can SELECT
- **Users**: self can read own profile; managers+ can read all; only admins can create/delete
- **QuotationItem / OrderItem**: inherit access via join to parent table (Quotation/Order)

## Deployment Steps

### Option A: Supabase CLI (recommended)

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Login + link project
supabase login
supabase link --project-ref your-project-ref

# Push migrations
supabase db push

# Or reset + apply from scratch
supabase db reset
```

### Option B: Manual SQL execution

1. Go to Supabase Dashboard → SQL Editor
2. Run `migrations/20260101000000_schema.sql` first
3. Run `migrations/20260101000001_rls_policies.sql` second

### Option C: psql

```bash
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres" \
  -f supabase/migrations/20260101000000_schema.sql
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres" \
  -f supabase/migrations/20260101000001_rls_policies.sql
```

## Switching the Next.js App to Supabase

After deploying the schema, update the app to use Supabase instead of Prisma+SQLite:

1. **Install Supabase client**:
   ```bash
   bun add @supabase/supabase-js
   ```

2. **Add env vars** to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. **Replace Prisma calls** in `src/app/api/*` with Supabase client:
   ```typescript
   // Before (Prisma)
   import { db } from '@/lib/db'
   const customers = await db.customer.findMany({ where: { ownerId: user.id } })

   // After (Supabase) — RLS handles scoping automatically
   import { supabase } from '@/lib/supabase'
   const { data: customers } = await supabase.from('Customer').select('*')
   ```

4. **Replace NextAuth with Supabase Auth** (optional):
   - Use `@supabase/ssr` for SSR auth
   - Or keep NextAuth and just point Prisma to Supabase Postgres URL:
     ```
     DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
     ```
   - Update `prisma/schema.prisma` datasource to `postgresql` and run `bun run db:push`

## Realtime

The migration enables Supabase Realtime on 8 key tables:
- Customer, Lead, Order, Quotation, Payment, FollowUp, ActivityLog, Inventory

To subscribe from the frontend:
```typescript
useEffect(() => {
  const channel = supabase
    .channel('orders-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'Order' }, payload => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    })
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}, [])
```

## Notes

- The schema uses `uuid` primary keys (via `gen_random_uuid()`) instead of Prisma's `cuid()` — more Postgres-native and better for distributed systems
- All foreign keys have explicit `on delete` behaviors (`restrict`, `cascade`, or `set null`)
- `updated_at` is auto-maintained via triggers
- The Prisma schema is forward-compatible: change `sqlite` → `postgresql` in `prisma/schema.prisma` and Prisma can generate a client that works with this schema
