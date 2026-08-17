# Nexus CRM — Quick Deploy Guide

## 3 Steps to Deploy

### Step 1: Set up Supabase Database

1. Go to [supabase.com](https://supabase.com) → sign up (free)
2. Create a new project
3. Go to **SQL Editor** → run `supabase/migrations/20260101000000_schema.sql`
4. Run `supabase/migrations/20260101000001_rls_policies.sql`
5. Go to **Settings → Database → Connection string → "Transaction" mode**
6. Copy the URL — it looks like:
   ```
   postgresql://postgres.XXXXX:PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres
   ```
7. Add `?pgbouncer=true` at the end

### Step 2: Push to GitHub + Deploy on Vercel

1. Unzip this package
2. Push to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Nexus CRM"
   git remote add origin https://github.com/YOU/nexus-crm.git
   git push -u origin main
   ```
3. Go to [vercel.com/new](https://vercel.com/new) → import your repo
4. Add Environment Variables:
   - `DATABASE_URL` = your Supabase pooler URL (with ?pgbouncer=true)
   - `NEXTAUTH_URL` = `https://your-app.vercel.app`
   - `NEXTAUTH_SECRET` = run `openssl rand -base64 32`
5. Click **Deploy** — wait 2-3 minutes

### Step 3: Seed Database + Login

1. After deploy completes, visit:
   ```
   https://your-app.vercel.app/api/seed
   ```
2. You'll see: `{"success":true,"message":"Database seeded successfully!"}`
3. Go to `https://your-app.vercel.app` → login:
   - Email: `admin@nexuscrm.io`
   - Password: `admin123`

## IMPORTANT NOTES

- Use the **pooler URL** (port 6543) NOT the direct URL (port 5432)
- Add `?pgbouncer=true` to the DATABASE_URL
- The Prisma schema is already set to `postgresql` provider
- The `/api/seed` endpoint creates users + products + settings automatically
- If Supabase pauses (free tier after 7 days), just restore it in dashboard

## Troubleshooting

**"Can't reach database server"**
→ Use the pooler URL (port 6543), not direct (port 5432)

**"Invalid credentials"**
→ Visit `/api/seed` first to create demo users

**"Column does not exist"**
→ The Prisma schema has `@map` annotations — make sure you deployed the latest code

**"Build failed"**
→ Make sure `DATABASE_URL` is set in Vercel environment variables
