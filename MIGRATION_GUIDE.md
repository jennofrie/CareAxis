# CareAxis — Supabase Migration & Setup Guide

This guide covers everything you need to do manually to fully activate the CareAxis project.
The code migration is complete — this is your step-by-step checklist to go live.

---

## What Was Already Done For You

- All 20 SQL migration files copied and adapted (bucket names: `spectra-reports` → `careaxis-reports`)
- All 16 edge functions copied, models upgraded, bucket references updated
  - RAG functions (`rag-agent`, `generate-embedding`) preserved exactly
  - `gemini-1.5-flash` → `gemini-2.0-flash` (analyze-image)
  - `gemini-2.5-flash-preview-09-2025` → `gemini-2.5-flash-preview-05-20` (analyze-text, generate-justification)
  - `gemini-2.0-flash-exp` → `gemini-2.0-flash` (generate-weekly-summary, suggest-goal-alignment)
- Next.js app fully copied and rebranded (Spectra → CareAxis everywhere)
- `supabase/config.toml` updated with new project ref `jlxfahqfmahrlztiedyd`
- `.env.local` and `.env.example` templates created with placeholders

---

## Prerequisites Checklist

Before starting, confirm you have:
- [ ] New Supabase project created at `jlxfahqfmahrlztiedyd` (ap-south-1)
- [ ] Database password (set when creating the project)
- [ ] Supabase CLI v2.75.0+ → `supabase --version`
- [ ] PostgreSQL tools → `brew install postgresql` (for `pg_dump`, `psql`)
- [ ] rclone (storage migration) → `brew install rclone`
- [ ] All API keys: Gemini, Stripe ×2, Resend

---

## Step 1 — Install/Verify Supabase CLI

```bash
brew upgrade supabase
supabase --version   # must be >= 2.75.0
```

---

## Step 2 — Enable Extensions in New Project Dashboard

Go to: **Supabase Dashboard → Database → Extensions**

Enable these extensions (in this order):
1. **`vector`** (pgvector) — CRITICAL: Must be enabled BEFORE running migrations
2. **`uuid-ossp`** — Usually enabled by default, verify it's on
3. **`pg_stat_statements`** — Optional, for performance monitoring

> ⚠️ If you skip `vector` extension, migration `20260114_document_embeddings.sql` will fail.

---

## Step 3 — Link CLI to CareAxis Project

```bash
cd /Users/profexer/Desktop/VStudio/SaaS/CareAxis
supabase login    # Login to your Supabase account
supabase link --project-ref jlxfahqfmahrlztiedyd
# Enter your database password when prompted
```

---

## Step 4 — Apply Schema Migrations

> ⚠️ **Known Issue — `cases` table**: Migration `20260113_add_plan_dates_to_cases.sql` runs
> `ALTER TABLE cases` but the `cases` table is NOT defined in any migration file. It was created
> outside of migrations in the source project. You have two options:
>
> **Option A (recommended)**: Create the `cases` table first via the SQL Editor in the Dashboard,
> then run `db push`. See the cases table SQL at the bottom of this guide.
>
> **Option B**: Remove or skip `20260113_add_plan_dates_to_cases.sql` if you don't need this feature yet.

```bash
cd /Users/profexer/Desktop/VStudio/SaaS/CareAxis

# Apply all migrations
supabase db push --project-ref jlxfahqfmahrlztiedyd
```

Verify it worked (should show no diff):
```bash
supabase db diff --project-ref jlxfahqfmahrlztiedyd
# Empty output = success
```

---

## Step 5 — Deploy Edge Functions

```bash
cd /Users/profexer/Desktop/VStudio/SaaS/CareAxis

# Deploy all 16 functions at once
supabase functions deploy --project-ref jlxfahqfmahrlztiedyd
```

If any individual function fails, deploy it separately:
```bash
supabase functions deploy analyze-image --project-ref jlxfahqfmahrlztiedyd
supabase functions deploy analyze-text --project-ref jlxfahqfmahrlztiedyd
supabase functions deploy analyze-roster --project-ref jlxfahqfmahrlztiedyd
supabase functions deploy synthesize-report --project-ref jlxfahqfmahrlztiedyd
supabase functions deploy senior-planner-audit --project-ref jlxfahqfmahrlztiedyd
supabase functions deploy plan-management-expert --project-ref jlxfahqfmahrlztiedyd
supabase functions deploy rag-agent --project-ref jlxfahqfmahrlztiedyd
supabase functions deploy generate-weekly-summary --project-ref jlxfahqfmahrlztiedyd
supabase functions deploy coc-cover-letter-generator --project-ref jlxfahqfmahrlztiedyd
supabase functions deploy coc-eligibility-assessor --project-ref jlxfahqfmahrlztiedyd
supabase functions deploy extract-plan-data --project-ref jlxfahqfmahrlztiedyd
supabase functions deploy forecast-budget --project-ref jlxfahqfmahrlztiedyd
supabase functions deploy generate-embedding --project-ref jlxfahqfmahrlztiedyd
supabase functions deploy generate-justification --project-ref jlxfahqfmahrlztiedyd
supabase functions deploy send-budget-alert --project-ref jlxfahqfmahrlztiedyd
supabase functions deploy suggest-goal-alignment --project-ref jlxfahqfmahrlztiedyd
```

---

## Step 6 — Set Edge Function Secrets

Go to **Dashboard → Settings → Edge Functions → Secrets**, or use the CLI:

```bash
supabase secrets set --project-ref jlxfahqfmahrlztiedyd \
  GEMINI_API_KEY="your-gemini-api-key" \
  STRIPE_SECRET_KEY="your-stripe-secret-key" \
  STRIPE_WEBHOOK_SECRET="your-stripe-webhook-secret" \
  RESEND_API_KEY="your-resend-api-key" \
  SUPABASE_SERVICE_ROLE_KEY="YOUR_NEW_SERVICE_ROLE_KEY"
```

> Get `SUPABASE_SERVICE_ROLE_KEY` from: Dashboard → Settings → API → `service_role` key
> This MUST be the CareAxis project's key — not the old Spectra key.

---

## Step 7 — Update App Environment Variables

Edit `/Users/profexer/Desktop/VStudio/SaaS/CareAxis/app/.env.local`:

```bash
# Get these from: Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://jlxfahqfmahrlztiedyd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_new_anon_key_here

# Stripe payment link from your Stripe Dashboard
NEXT_PUBLIC_STRIPE_PREMIUM_LINK=https://buy.stripe.com/your_link

# App version
NEXT_PUBLIC_APP_VERSION=2.1.0
```

---

## Step 8 — Configure Stripe Webhook

1. Go to **Stripe Dashboard → Developers → Webhooks**
2. Click **Add endpoint**
3. URL: `https://jlxfahqfmahrlztiedyd.supabase.co/functions/v1/stripe-webhook`
4. Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
5. Copy the **Signing secret** (starts with `whsec_...`)
6. Update your secrets:
```bash
supabase secrets set --project-ref jlxfahqfmahrlztiedyd \
  STRIPE_WEBHOOK_SECRET="whsec_your_new_secret_here"
```

---

## Step 9 — Configure Auth Settings

Go to **Dashboard → Authentication → Settings** and set:

| Setting | Value |
|---------|-------|
| Site URL | Your app URL (e.g., `https://careaxis.app`) |
| Redirect URLs | `http://localhost:3001/**`, `https://careaxis.app/**` |
| JWT Expiry | 3600 (or match your preference) |
| Email confirmations | Enable |

---

## Step 10 — Install Dependencies and Run App

```bash
cd /Users/profexer/Desktop/VStudio/SaaS/CareAxis/app
npm install

# Run development server on port 3001
npm run dev
```

Visit: `http://localhost:3001`

---

## Step 11 — Verify Everything Works

Run through this checklist after startup:

- [ ] App loads at localhost:3001
- [ ] Sign up with a new account
- [ ] Profile row created in `profiles` table (check Dashboard → Table Editor)
- [ ] `analyze-text` function works (Visual Case Notes page)
- [ ] `synthesize-report` function works (Report Synthesizer page)
- [ ] `senior-planner-audit` function works (Senior Planner page) — Premium feature
- [ ] Budget Forecaster page loads
- [ ] Settings page loads, subscription tier shows correctly
- [ ] Storage buckets `justification-attachments` and `careaxis-reports` exist (Dashboard → Storage)

```bash
# Quick smoke test for edge functions
curl https://jlxfahqfmahrlztiedyd.supabase.co/functions/v1/analyze-text \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"textInput": "Test case note input"}'
```

---

## Migrating Existing Users from Spectra (Optional)

If you need to move production users and their data from the old Spectra project:

### Get your source DB password
Dashboard (old Spectra project) → Settings → Database → Reset if needed

### 1. Dump auth users from Spectra
```bash
pg_dump \
  "postgresql://postgres.xogkgedxhwlgeclmaqmu:[SOURCE_PASSWORD]@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres" \
  --schema auth \
  --table "auth.users" \
  --table "auth.identities" \
  --data-only --no-owner --no-acl \
  -f ./migration-export/auth-users.sql
```

### 2. Dump public data from Spectra
```bash
supabase db dump --project-ref xogkgedxhwlgeclmaqmu \
  --data-only --schema public \
  -f ./migration-export/data.sql
```

### 3. Import auth users into CareAxis (with triggers disabled)
```bash
TARGET="postgresql://postgres.jlxfahqfmahrlztiedyd:[NEW_PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"

psql "$TARGET" -c "SET session_replication_role = replica;"
psql "$TARGET" -f ./migration-export/auth-users.sql
psql "$TARGET" -c "SET session_replication_role = DEFAULT;"
```

### 4. Import public data
```bash
psql "$TARGET" -f ./migration-export/data.sql
```

### 5. Migrate storage files (rclone)
```bash
# Configure rclone sources
rclone config create spectra-old s3 \
  provider=Other \
  access_key_id=xogkgedxhwlgeclmaqmu \
  secret_access_key=OLD_SERVICE_ROLE_KEY \
  endpoint=https://xogkgedxhwlgeclmaqmu.supabase.co/storage/v1/s3 acl=private

rclone config create careaxis-new s3 \
  provider=Other \
  access_key_id=jlxfahqfmahrlztiedyd \
  secret_access_key=NEW_SERVICE_ROLE_KEY \
  endpoint=https://jlxfahqfmahrlztiedyd.supabase.co/storage/v1/s3 acl=private

# Copy files
rclone copy spectra-old:justification-attachments careaxis-new:justification-attachments --progress
rclone copy spectra-old:spectra-reports careaxis-new:careaxis-reports --progress
```

---

## Cases Table — SQL (Run Before Migrations If Needed)

If `supabase db push` fails on `20260113_add_plan_dates_to_cases.sql`, run this in the SQL Editor first:

```sql
CREATE TABLE IF NOT EXISTS cases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  participant_name TEXT NOT NULL,
  ndis_number TEXT,
  date_of_birth DATE,
  plan_start_date DATE,
  plan_end_date DATE,
  goals JSONB DEFAULT '[]'::jsonb,
  functional_impairments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own cases"
  ON cases FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_cases_user_id ON cases(user_id);
```

---

## Quick Reference — Your Project Details

| Item | Value |
|------|-------|
| Project ref | `jlxfahqfmahrlztiedyd` |
| Region | AWS ap-south-1 |
| Supabase URL | `https://jlxfahqfmahrlztiedyd.supabase.co` |
| App port | 3001 |
| Storage bucket 1 | `justification-attachments` |
| Storage bucket 2 | `careaxis-reports` |
| Edge functions | 16 total |
| Migrations | 20 total |

---

## Secrets Reference

All secrets needed for edge functions:

| Secret Name | Where to Get It |
|-------------|-----------------|
| `GEMINI_API_KEY` | Google AI Studio → API Keys |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API Keys → Secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → Your endpoint → Signing secret |
| `RESEND_API_KEY` | Resend Dashboard → API Keys |
| `SUPABASE_SERVICE_ROLE_KEY` | CareAxis Dashboard → Settings → API → service_role |
