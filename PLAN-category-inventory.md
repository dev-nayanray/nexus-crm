# Plan: Dynamic Category Management + Enhanced Inventory System
Repo: `dev-nayanray/nexus-crm` · Author of plan: senior review pass, Aug 18 2026

## 1. Wireframe cross-check

Your `Draft.pdf` sidebar (16 items: Dashboard → Email logs) matches the app's `NAV_GROUPS`
in `src/lib/constants.ts` 1:1 — every wireframe screen already has a real module
(`src/components/modules/*`) and API route (`src/app/api/*`). Nothing from the wireframe
itself is missing.

The gap is inside two of those screens, exactly as you flagged:

- **Products → Category** is a free-text `String` column (`Product.category`). No CRUD, no
  hierarchy, no reuse — every product row invents its own spelling of a category.
- **Inventory** has quantity/reorder-level/location fields but no audit trail: stock
  changes overwrite `quantity` with no record of who changed what, when, or why, and no
  "receive vs. adjust vs. sale" distinction. There's also no per-warehouse breakdown.

## 2. Category Management System (new)

**Schema** — new `Category` model, self-referencing for unlimited subcategories:
`id, name, slug (unique), description, parentId → Category?, imageUrl, status, sortOrder,
timestamps`. `Product.category` (string) stays for backward compatibility with existing
data; a new `Product.categoryId → Category?` is added alongside it. Existing string values
are left as-is (nothing breaks) and can be mapped to real categories over time from the UI.

**API** — `/api/categories` (GET tree/flat + search, POST) and `/api/categories/[id]`
(GET, PATCH, DELETE). Delete is blocked with a clear error if the category still has
children or linked products, so data never gets orphaned silently.

**UI** — new **Categories** module in the Catalog nav group: parent/child list, create/edit
dialog (name, parent, description, image, status, sort order), delete guard. The Products
module's category field switches from free-text to a live dropdown sourced from this API,
with a "Manage categories" shortcut. Product list/detail keep showing the category name.

## 3. Inventory: dynamic feature set

**Schema** — new `StockMovement` model: `id, inventoryId, productId, type
(RECEIVE|ADJUST|SALE|RETURN|DAMAGE|TRANSFER|CORRECTION), quantityChange, quantityAfter,
reason, reference, userId, createdAt`. Every write to `Inventory.quantity` — whether from
the Inventory module, a new product's initial stock, or a future PO receipt — now creates a
movement row instead of silently overwriting the number.

**API** — `/api/inventory` and `/api/inventory/[id]` now require/accept a `type` and
`reason` on every change and log a `StockMovement`. New `/api/inventory/[id]/movements`
returns the full audit trail for one product's stock.

**UI** — Adjust Stock dialog gains a movement **type** and **reason** field. Clicking an
inventory row opens a detail drawer with current stock plus a chronological movement
history (who/when/why), so "why is this number what it is" is always answerable.

## 4. Task order (this session)

1. `prisma/schema.prisma` — add `Category`, `StockMovement`, wire relations. ✅ additive,
   no destructive changes to existing tables.
2. New SQL migration in `supabase/migrations/` (numbered after the existing ones) so you
   can apply it with `prisma migrate deploy` / `db push` against your real Supabase DB —
   this sandbox has no DB credentials, so I validate the schema with `prisma validate`
   instead of running a live migration.
3. `src/lib/constants.ts` / `permissions.ts` — register the `categories` module + nav entry
   + role access (same roles as Products).
4. API routes: `categories` (list/detail), `inventory` movement logging + `movements`
   sub-route, `products` schema updated for `categoryId`.
5. UI: new `categories` module, `products` + `inventory` modules updated, router wired in.
6. `prisma/seed.ts` — seed a starter category tree and backfill demo products.
7. Validate (`prisma validate`, targeted TypeScript check), commit in logical chunks, push.

Proceeding to implementation now, one task at a time.
