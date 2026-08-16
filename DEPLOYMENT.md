# Nexus CRM — Deployment Guide

Complete guide to deploy Nexus CRM to **Vercel** with **Supabase Postgres** backend.

## Prerequisites

- [Vercel account](https://vercel.com) (free tier works)
- [Supabase account](https://supabase.com) (free tier works)
- [GitHub account](https://github.com) (to push the repo)
- Node.js 18+ / Bun installed locally

---

## Step 1: Push to GitHub

```bash
# Initialize git (if not already)
git init
git add .
git commit -m "Nexus CRM — production-ready B2B CRM"

# Create a new repo on GitHub, then push
git remote add origin https://github.com/YOUR_USERNAME/nexus-crm.git
git branch -M main
git push -u origin main
```

---

## Step 2: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Name: `nexus-crm`
3. Set a strong database password (save it!)
4. Region: closest to your users
5. Plan: Free tier is fine

### Apply the schema

#### Option A: Via SQL Editor (easiest)
1. In Supabase Dashboard → **SQL Editor**
2. Copy-paste contents of `supabase/migrations/20260101000000_schema.sql` → Run
3. Copy-paste contents of `supabase/migrations/20260101000001_rls_policies.sql` → Run

#### Option B: Via Supabase CLI
```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### Get your connection string
1. Dashboard → **Project Settings** → **Database**
2. Copy the **Connection string** (URI format):
   ```
   postgresql://postgres:[YOUR_PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
   ```

### Seed the database (optional)
Run the seed script against Supabase:
```bash
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres" bun run db:seed
```

---

## Step 3: Deploy to Vercel

### Option A: Via Vercel Dashboard (recommended)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo `nexus-crm`
3. Framework Preset: **Next.js** (auto-detected)
4. **Environment Variables** — add these:

| Name | Value | Environments |
|------|-------|--------------|
| `DATABASE_URL` | `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres` | Production, Preview |
| `NEXTAUTH_URL` | `https://nexus-crm.vercel.app` (your Vercel URL) | Production |
| `NEXTAUTH_SECRET` | Generate with `openssl rand -base64 32` | Production, Preview |
| `NEXTAUTH_URL_PREVIEW` | `https://nexus-crm-pr-[NUM].vercel.app` | Preview (optional) |

5. Click **Deploy**
6. Wait ~2-3 minutes for build to complete

### Option B: Via Vercel CLI

```bash
npm install -g vercel
vercel login

# Link to project
vercel link

# Set environment variables
vercel env add DATABASE_URL production preview
vercel env add NEXTAUTH_URL production
vercel env add NEXTAUTH_SECRET production preview

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

---

## Step 4: Update Prisma Schema for Postgres

The schema currently uses SQLite. For Supabase, update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // changed from "sqlite"
  url      = env("DATABASE_URL")
}
```

Then regenerate the Prisma client:
```bash
bun run db:generate
```

> **Note:** The Supabase SQL migration in `supabase/migrations/` is the source of truth.
> The Prisma schema is kept in sync for local development. When you run `db:push` against
> Supabase, Prisma will compare and warn about any drift.

---

## Step 5: Deploy the Realtime Service (optional)

The Socket.io mini-service runs separately from Vercel (Vercel is serverless, can't hold persistent WebSocket connections).

### Option A: Deploy to Railway.app (recommended, free tier)

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
2. Select your `nexus-crm` repo
3. Set **Root Directory**: `mini-services/crm-realtime`
4. Set **Start Command**: `bun run start`
5. Railway will assign a URL like `crm-realtime-production.up.railway.app`
6. In Vercel, set `REALTIME_URL` to `https://crm-realtime-production.up.railway.app`

### Option B: Deploy to Render.com

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect GitHub repo
3. **Root Directory**: `mini-services/crm-realtime`
4. **Build Command**: `bun install`
5. **Start Command**: `bun run start`
6. Free tier works for low traffic

### Option C: Skip realtime (simplest)

Leave `REALTIME_URL` empty. The app falls back to TanStack Query's 30-second polling — all features still work, just not real-time push.

---

## Step 6: Post-Deployment Checklist

- [ ] Visit your Vercel URL → login page loads
- [ ] Login with `admin@nexuscrm.io / admin123` → dashboard loads with data
- [ ] Create a test customer → appears in list
- [ ] Open an order → click "Invoice PDF" → PDF downloads
- [ ] Open the notifications bell → shows real alerts
- [ ] Press Cmd+K → command palette opens
- [ ] Test on mobile viewport → responsive layout works

### Update production seed (if needed)

If you didn't seed Supabase in Step 2, run:
```bash
DATABASE_URL="your-supabase-url" bun run db:seed
```

---

## Step 7: Custom Domain (optional)

1. Vercel Dashboard → your project → **Settings** → **Domains**
2. Add your domain (e.g., `crm.yourcompany.com`)
3. Update DNS records as instructed
4. Update `NEXTAUTH_URL` env var to `https://crm.yourcompany.com`

---

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Vercel        │     │   Supabase       │     │   Railway/Render│
│   (Next.js)     │────▶│   (Postgres)     │     │   (Socket.io)   │
│                 │     │                  │     │                 │
│ • SSR/SSG       │     │ • 17 tables      │     │ • Port 3003     │
│ • API routes    │     │ • RLS policies   │     │   (socket.io)   │
│ • Auth (JWT)    │     │ • Realtime pub   │     │ • Port 3004     │
│ • PDF gen       │     │ • Auth (optional)│     │   (broadcast)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       ▲                       │
         │                       │                       │
         └─────── fetch ─────────┘                       │
                 (Prisma)                                │
                                                        │
         ┌───────────────────────────────────────────────┘
         │  HTTP POST /broadcast (from API routes)
         ▼
    Browser receives via Socket.io client
    → invalidates TanStack Query caches
    → UI updates in real-time
```

## Free Tier Limits

| Service | Free Tier | CRM Usage |
|---------|-----------|-----------|
| **Vercel** | 100GB bandwidth, 100hrs serverless | Plenty for small team |
| **Supabase** | 500MB DB, 1GB storage, 50K MAU | ~10K records easily |
| **Railway** | $5/mo credit (~500hrs) | 24/7 realtime service |
| **Total** | ~$0-5/mo | Production-ready |

## Troubleshooting

### "Database connection failed"
- Check `DATABASE_URL` is set in Vercel env vars
- Verify Supabase project is not paused (free tier pauses after 7 days inactivity)
- Ensure IP is not blocked (Supabase Dashboard → Database → Network Restrictions)

### "NextAuth error"
- `NEXTAUTH_URL` must match your Vercel URL exactly (including https://)
- `NEXTAUTH_SECRET` must be at least 32 characters
- Generate new secret: `openssl rand -base64 32`

### "PDF generation timeout"
- Vercel serverless functions have 10s default timeout (Hobby plan)
- PDF generation can take 2-5s for large documents
- `vercel.json` already sets `maxDuration: 30` for PDF routes
- Upgrade to Pro plan for 60s timeout if needed

### "Realtime not working"
- Check `REALTIME_URL` env var points to your Railway/Render URL
- Verify the realtime service is running: `curl https://your-rt-url/health`
- App gracefully falls back to polling if realtime is down

### "Prisma client not generated"
- Add `postinstall` script to `package.json`: `"postinstall": "prisma generate"`
- Vercel runs this automatically after install
