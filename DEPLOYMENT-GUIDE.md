# Nexus CRM — Complete Deployment Guide

## Table of Contents
1. [What's Included](#whats-included)
2. [Prerequisites](#prerequisites)
3. [Step 1: Set Up Free Database (Supabase)](#step-1-set-up-free-database-supabase)
4. [Step 2: Configure Environment Variables](#step-2-configure-environment-variables)
5. [Step 3: Deploy to Vercel](#step-3-deploy-to-vercel)
6. [Step 4: Post-Deployment Setup](#step-4-post-deployment-setup)
7. [Step 5: Seed Your Database](#step-5-seed-your-database)
8. [Troubleshooting](#troubleshooting)

---

## What's Included

This package contains the complete Nexus CRM application:

- **16 CRM Modules**: Dashboard, Customers, Leads, Follow-ups, Quotations, Orders, Payments, Products, Inventory, Purchase Orders, Calls & Messages, Email Logs, Activity Logs, Users & Roles, Reports & KPIs, Settings
- **Modern UI**: Slate + Emerald theme, glassmorphism, gradient cards, dark mode
- **Kanban Boards**: Drag-and-drop for Leads, Orders, Quotations, Follow-ups
- **Bulk Actions**: Select multiple records → delete, assign, change status
- **CSV Export**: Export any list to CSV with filters applied
- **PDF Generation**: Branded invoices and quotations
- **Command Palette**: Cmd+K global search
- **Real-time Updates**: Socket.io (optional)
- **Lead Scoring**: Auto-computed 0-100 scores
- **Customer Timeline**: Unified activity view
- **Saved Filters**: Per-module filter presets
- **Notifications Panel**: Real alerts (overdue, pending, low stock)
- **Role-Based Access**: Admin, Sales Manager, Sales Rep
- **Supabase Migration**: SQL schema + RLS policies included

---

## Prerequisites

- [Node.js 18+](https://nodejs.org/) or [Bun](https://bun.sh/)
- [Vercel account](https://vercel.com) (free)
- [Supabase account](https://supabase.com) (free)
- [GitHub account](https://github.com) (for Vercel deployment)

---

## Step 1: Set Up Free Database (Supabase)

### 1.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Click **"New Project"**
3. Fill in:
   - **Name**: `nexus-crm`
   - **Database Password**: Create a strong password (SAVE THIS!)
   - **Region**: Choose closest to your users
   - **Plan**: Free tier
4. Click **"Create new project"** and wait ~2 minutes

### 1.2 Get Your Connection String

1. Go to **Project Settings** → **Database**
2. Find **"Connection string"** → select **"URI"** format
3. Copy it — it looks like:
   ```
   postgresql://postgres:[YOUR_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
   ```
4. Replace `[YOUR_PASSWORD]` with the password you set in step 1.1

### 1.3 Apply the Database Schema

You have two options:

**Option A: Via Supabase SQL Editor (Easiest)**

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **"New query"**
3. Open the file `supabase/migrations/20260101000000_schema.sql` from this package
4. Copy all content, paste into the SQL editor
5. Click **"Run"** — this creates all 17 tables, enums, and indexes
6. Open `supabase/migrations/20260101000001_rls_policies.sql`
7. Copy all content, paste into a new query
8. Click **"Run"** — this adds Row Level Security policies

**Option B: Via Supabase CLI**

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### 1.4 Get Your Project URL and API Keys

1. Go to **Project Settings** → **API**
2. Copy:
   - **Project URL**: `https://[PROJECT_REF].supabase.co`
   - **anon public key**: `eyJhbGciOi...` (long string)
   - **service_role key**: `eyJhbGciOi...` (different long string — keep secret!)

---

## Step 2: Configure Environment Variables

Create a `.env.local` file in the project root with these variables:

```env
# Database (from Step 1.2)
DATABASE_URL="postgresql://postgres:[YOUR_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

# NextAuth (generate secret below)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="run: openssl rand -base64 32"

# Realtime (optional — leave empty to disable)
REALTIME_URL=""
```

### Generate NEXTAUTH_SECRET

Run this command in your terminal and copy the output:

```bash
openssl rand -base64 32
```

If you don't have OpenSSL, use any random 32+ character string.

### Update Prisma Schema for PostgreSQL

Open `prisma/schema.prisma` and change the datasource provider from `sqlite` to `postgresql`:

```prisma
datasource db {
  provider = "postgresql"  # Changed from "sqlite"
  url      = env("DATABASE_URL")
}
```

Then run:

```bash
bun install
bun run db:generate
```

---

## Step 3: Deploy to Vercel

### 3.1 Push to GitHub

```bash
# Initialize git (if not already)
git init
git add .
git commit -m "Nexus CRM — production-ready B2B CRM"

# Create a new repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/nexus-crm.git
git branch -M main
git push -u origin main
```

### 3.2 Deploy on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Find and select your `nexus-crm` repo
4. Configure:
   - **Framework Preset**: Next.js (auto-detected)
   - **Build Command**: `bun run build` (or `npm run build`)
   - **Install Command**: `bun install` (or `npm install`)
   - **Output Directory**: `.next` (auto-detected)

5. **Add Environment Variables** (click "Environment Variables" section):

   | Name | Value | Environments |
   |------|-------|--------------|
   | `DATABASE_URL` | `postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres` | Production, Preview |
   | `NEXTAUTH_URL` | `https://your-app.vercel.app` (your Vercel URL) | Production |
   | `NEXTAUTH_SECRET` | Your generated secret from Step 2 | Production, Preview |
   | `REALTIME_URL` | (leave empty) | All |

6. Click **"Deploy"**
7. Wait 2-3 minutes for the build to complete

### 3.3 Alternative: Vercel CLI

If you prefer the command line:

```bash
npm install -g vercel
vercel login

# Link to project
vercel link

# Set environment variables
vercel env add DATABASE_URL
vercel env add NEXTAUTH_URL
vercel env add NEXTAUTH_SECRET

# Deploy to production
vercel --prod
```

---

## Step 4: Post-Deployment Setup

### 4.1 Update NEXTAUTH_URL

After your first deployment, Vercel gives you a URL like `https://nexus-crm-xxx.vercel.app`.

1. Go to Vercel Dashboard → your project → **Settings** → **Environment Variables**
2. Update `NEXTAUTH_URL` to your new Vercel URL
3. Redeploy: go to **Deployments** → click **"..."** on latest → **"Redeploy"**

### 4.2 Verify the Deployment

Visit your Vercel URL and check:

- [ ] Login page loads (split-screen design)
- [ ] Sign in works with demo credentials
- [ ] Dashboard shows KPI cards and charts
- [ ] Sidebar shows all 16 modules
- [ ] Clicking a module loads its table/list
- [ ] Cmd+K opens command palette
- [ ] Bell icon shows notifications
- [ ] Dark mode toggle works

---

## Step 5: Seed Your Database

The database is empty. You need to create initial users and demo data.

### 5.1 Run the Seed Script

```bash
# Set your production DATABASE_URL
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

# Run the seed
bun run db:seed
```

This creates:
- 5 users (1 admin, 1 manager, 3 reps)
- 30 customers
- 50 leads
- 40 quotations
- 30 orders
- 20 payments
- 20 products
- 8 purchase orders
- 35 follow-ups
- 25 calls
- 20 email logs
- 50 activity logs

### 5.2 Default Login Credentials

After seeding, sign in with:

| Role | Email | Password |
|------|-------|----------|
| Administrator | `admin@nexuscrm.io` | `admin123` |
| Sales Manager | `manager@nexuscrm.io` | `manager123` |
| Sales Rep | `rep@nexuscrm.io` | `rep123` |

**⚠️ Change these passwords immediately after first login!**

### 5.3 Change Admin Password

1. Sign in as admin
2. Go to **Users & Roles** module
3. Click your user → **Edit**
4. Enter a new password → **Save**

---

## Troubleshooting

### "Database connection failed"

- Verify `DATABASE_URL` is correct in Vercel env vars
- Check that your Supabase project is **not paused** (free tier pauses after 7 days of inactivity)
- Go to Supabase Dashboard → **Database** → check status
- Ensure the password in the URL is URL-encoded if it contains special characters

### "NextAuth error: missing secret"

- `NEXTAUTH_SECRET` must be set in Vercel environment variables
- Generate with: `openssl rand -base64 32`
- Must be at least 32 characters

### "Prisma client not generated"

Add this to `package.json` scripts (already included):

```json
"postinstall": "prisma generate"
```

This runs automatically on Vercel after `npm install`.

### "White screen after login"

- Check browser console (F12) for errors
- Verify all environment variables are set in Vercel
- Try hard refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)
- Clear browser localStorage: DevTools → Application → Local Storage → Clear

### "PDF generation timeout"

- Vercel serverless functions have 10s timeout on free plan
- The `vercel.json` already sets `maxDuration: 30` for PDF routes
- If still timing out, upgrade to Vercel Pro for 60s timeout

### "Realtime not working"

- Realtime is optional — the app works fine without it (uses 30s polling)
- To enable: deploy the `mini-services/crm-realtime` service to Railway.app or Render.com
- Set `REALTIME_URL` env var to the deployed service URL

### "Build fails on Vercel"

Common causes:
- Missing `DATABASE_URL` env var → add it in Vercel settings
- Prisma schema still using `sqlite` → change to `postgresql`
- Node version mismatch → add `"engines": {"node": ">=18.0.0"}` to package.json

---

## Free Tier Limits

| Service | Free Tier | Enough For |
|---------|-----------|------------|
| **Vercel** | 100GB bandwidth, 100hrs serverless | ~10K page views/month |
| **Supabase** | 500MB database, 1GB storage, 50K MAU | ~5K records, 50 users |
| **Total Cost** | **$0/month** | Small team CRM |

---

## Custom Domain (Optional)

1. Vercel Dashboard → your project → **Settings** → **Domains**
2. Add your domain (e.g., `crm.yourcompany.com`)
3. Update DNS records as instructed
4. Update `NEXTAUTH_URL` env var to your custom domain
5. Redeploy

---

## Support

If you encounter issues:
1. Check the **Troubleshooting** section above
2. Check browser console (F12) for error messages
3. Check Vercel deployment logs
4. Check Supabase database logs

The CRM is production-ready and deployed on free tiers. No credit card required.
