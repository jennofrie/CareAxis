# CareAxis — Supabase Migration & Setup Guide

> Maintained by **JD Digital Systems** — [github.com/jennofrie/CareAxis](https://github.com/jennofrie/CareAxis)

This guide covers every manual step required to fully activate a new CareAxis deployment. The codebase is complete — this checklist takes you from a blank Supabase project to a fully operational instance.

---

## What Is Pre-Configured

- All 20 SQL migration files — schema adapted for CareAxis (storage bucket names, project references)
- All 18 edge functions — models upgraded and bucket references updated
  - `gemini-1.5-flash` → `gemini-2.0-flash` (`analyze-image`)
  - `gemini-2.0-flash-exp` → `gemini-2.0-flash` (`generate-weekly-summary`, `suggest-goal-alignment`)
  - `gemini-2.5-flash-preview-09-2025` → `gemini-2.5-flash-preview-05-20` (`analyze-text`, `generate-justification`)
  - RAG functions (`rag-agent`, `generate-embedding`) preserved as-is
- Next.js application fully configured and branded as CareAxis
- `supabase/config.toml` updated with project ref `jlxfahqfmahrlztiedyd`
- `.env.example` template with all required placeholders

---

## Prerequisites Checklist

Before starting, confirm you have:

- [ ] Supabase project created at `jlxfahqfmahrlztiedyd` (AWS ap-south-1)
- [ ] Supabase database password (set when creating the project)
- [ ] Supabase CLI v2.75.0+ — verify with `supabase --version`
- [ ] PostgreSQL tools — `brew install postgresql` (for `pg_dump` and `psql`, needed only for data migration)
- [ ] rclone — `brew install rclone` (needed only for storage file migration)
- [ ] All required API keys: Gemini, Stripe (secret key + webhook secret), Resend

---

## Step 1 — Verify Supabase CLI Version

```bash
brew upgrade supabase
supabase --version   # must be 2.75.0 or higher
```

---

## Step 2 — Enable Database Extensions

Navigate to **Supabase Dashboard → Database → Extensions** and enable the following in order:

1. **`vector`** (pgvector) — **REQUIRED before running migrations.** Must be installed in the `extensions` schema.
2. **`uuid-ossp`** — Usually enabled by default; verify it is active.
3. **`pg_stat_statements`** — Optional; used for performance monitoring.

> If you skip the `vector` extension, migration `20260114_document_embeddings.sql` will fail with a type resolution error.

---

## Step 3 — Link CLI to the Project

```bash
cd /path/to/CareAxis
supabase login
supabase link --project-ref jlxfahqfmahrlztiedyd
# Enter your database password when prompted
```

---

## Step 4 — Apply Schema Migrations

> **Known issue — `cases` table**: Migration `20260113_add_plan_dates_to_cases.sql` runs `ALTER TABLE cases`, but the `cases` table was created outside of the migration sequence in the source project.
>
> **Option A (recommended)**: Create the `cases` table manually via the SQL Editor before running `db push`. See the SQL at the end of this guide.
>
> **Option B**: Remove or skip `20260113_add_plan_dates_to_cases.sql` if the feature is not immediately needed.

```bash
supabase db push --project-ref jlxfahqfmahrlztiedyd
```

Verify all migrations applied cleanly (output should be empty):

```bash
supabase db diff --project-ref jlxfahqfmahrlztiedyd
```

---

## Step 5 — Deploy Edge Functions

Deploy all 18 functions at once:

```bash
supabase functions deploy --project-ref jlxfahqfmahrlztiedyd
```

If any function fails, deploy it individually:

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
supabase functions deploy quantum-sign --project-ref jlxfahqfmahrlztiedyd
supabase functions deploy quantum-sign-public --project-ref jlxfahqfmahrlztiedyd
```

---

## Step 6 — Set Edge Function Secrets

Via the Supabase Dashboard (**Settings → Edge Functions → Secrets**) or CLI:

```bash
supabase secrets set --project-ref jlxfahqfmahrlztiedyd \
  GEMINI_API_KEY="your-gemini-api-key" \
  STRIPE_SECRET_KEY="your-stripe-secret-key" \
  STRIPE_WEBHOOK_SECRET="your-stripe-webhook-secret" \
  RESEND_API_KEY="your-resend-api-key" \
  SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

> Obtain `SUPABASE_SERVICE_ROLE_KEY` from: **Dashboard → Settings → API → service_role key**
> This must be the CareAxis project's key.

---

## Step 7 — Configure Application Environment Variables

Edit `.env` in the project root:

```env
# From: Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://jlxfahqfmahrlztiedyd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# From: Stripe Dashboard → Payment Links
NEXT_PUBLIC_STRIPE_PREMIUM_LINK=https://buy.stripe.com/your_link

# Application version
NEXT_PUBLIC_APP_VERSION=2.1.0
```

---

## Step 8 — Configure Stripe Webhook

1. Go to **Stripe Dashboard → Developers → Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://jlxfahqfmahrlztiedyd.supabase.co/functions/v1/stripe-webhook`
4. Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
5. Copy the signing secret (begins with `whsec_...`)
6. Update the secret in Supabase:

```bash
supabase secrets set --project-ref jlxfahqfmahrlztiedyd \
  STRIPE_WEBHOOK_SECRET="whsec_your_signing_secret"
```

---

## Step 9 — Configure Authentication Settings

Navigate to **Dashboard → Authentication → Settings**:

| Setting | Value |
|---|---|
| Site URL | Your application URL (e.g. `https://careaxis.app`) |
| Redirect URLs | `http://localhost:3001/**`, `https://careaxis.app/**` |
| JWT Expiry | 3600 (or match your preference) |
| Email Confirmations | Enable for production |

---

## Step 10 — Install Dependencies and Start the Application

```bash
npm install
npm run dev
```

Visit [http://localhost:3001](http://localhost:3001).

---

## Step 11 — Verify the Deployment

Run through this checklist after startup:

- [ ] Application loads at `localhost:3001`
- [ ] Sign up with an `@cdssvic.com.au` email address
- [ ] Profile row created in the `profiles` table (Dashboard → Table Editor)
- [ ] `analyze-text` function responds (Visual Case Notes page)
- [ ] `synthesize-report` function responds (Report Synthesizer page)
- [ ] `senior-planner-audit` function responds (Senior Planner page — Premium)
- [ ] Budget Forecaster page loads and accepts input
- [ ] Storage buckets `justification-attachments` and `careaxis-reports` exist (Dashboard → Storage)

Quick smoke test for a public edge function:

```bash
curl https://jlxfahqfmahrlztiedyd.supabase.co/functions/v1/analyze-text \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"text": "Test case note input"}'
```

---

## Migrating Existing User Data (Optional)

If you need to move production users and data from a prior Supabase project:

### 1. Export auth users from the source project

```bash
pg_dump \
  "postgresql://postgres.<SOURCE_REF>:<SOURCE_PASSWORD>@aws-0-<SOURCE_REGION>.pooler.supabase.com:5432/postgres" \
  --schema auth \
  --table "auth.users" \
  --table "auth.identities" \
  --data-only --no-owner --no-acl \
  -f ./migration-export/auth-users.sql
```

### 2. Export public schema data from the source project

```bash
supabase db dump --project-ref <SOURCE_REF> \
  --data-only --schema public \
  -f ./migration-export/data.sql
```

### 3. Import auth users into CareAxis (with triggers disabled)

```bash
TARGET="postgresql://postgres.jlxfahqfmahrlztiedyd:<NEW_PASSWORD>@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"

psql "$TARGET" -c "SET session_replication_role = replica;"
psql "$TARGET" -f ./migration-export/auth-users.sql
psql "$TARGET" -c "SET session_replication_role = DEFAULT;"
```

### 4. Import public schema data

```bash
psql "$TARGET" -f ./migration-export/data.sql
```

### 5. Migrate storage files with rclone

```bash
# Configure source
rclone config create source-old s3 \
  provider=Other \
  access_key_id=<SOURCE_REF> \
  secret_access_key=<OLD_SERVICE_ROLE_KEY> \
  endpoint=https://<SOURCE_REF>.supabase.co/storage/v1/s3 acl=private

# Configure destination
rclone config create careaxis-new s3 \
  provider=Other \
  access_key_id=jlxfahqfmahrlztiedyd \
  secret_access_key=<NEW_SERVICE_ROLE_KEY> \
  endpoint=https://jlxfahqfmahrlztiedyd.supabase.co/storage/v1/s3 acl=private

# Copy files
rclone copy source-old:justification-attachments careaxis-new:justification-attachments --progress
rclone copy source-old:reports careaxis-new:careaxis-reports --progress
```

---

## Cases Table SQL

If `supabase db push` fails on `20260113_add_plan_dates_to_cases.sql`, create the `cases` table manually via the SQL Editor before re-running `db push`:

```sql
CREATE TABLE IF NOT EXISTS cases (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                 UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  participant_name        TEXT NOT NULL,
  ndis_number             TEXT,
  date_of_birth           DATE,
  plan_start_date         DATE,
  plan_end_date           DATE,
  goals                   JSONB DEFAULT '[]'::jsonb,
  functional_impairments  JSONB DEFAULT '[]'::jsonb,
  created_at              TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at              TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own cases"
  ON cases FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_cases_user_id ON cases(user_id);
```

---

## Quick Reference

| Item | Value |
|---|---|
| Project ref | `jlxfahqfmahrlztiedyd` |
| Region | AWS ap-south-1 |
| Supabase URL | `https://jlxfahqfmahrlztiedyd.supabase.co` |
| Application port | 3001 |
| Storage bucket 1 | `justification-attachments` |
| Storage bucket 2 | `careaxis-reports` |
| Edge functions | 18 total |
| SQL migrations | 20 total |

---

## Secrets Reference

| Secret | Source |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio → API Keys |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API Keys → Secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → Signing secret |
| `RESEND_API_KEY` | Resend Dashboard → API Keys |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → service_role |

---

*CareAxis is a product of JD Digital Systems. For internal support, contact the development team via your organisation's standard channels.*
