# CareAxis Deployment Guide

> Maintained by **JD Digital Systems**
> GitHub: https://github.com/jennofrie/CareAxis
> Last updated: 2026-02-27

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Supabase Setup](#supabase-setup)
- [Edge Functions Deployment](#edge-functions-deployment)
- [Storage Buckets](#storage-buckets)
- [Auth Configuration](#auth-configuration)
- [Development](#development)
- [Production Build](#production-build)
- [Vercel Deployment](#vercel-deployment-recommended)
- [Smoke Tests Checklist](#smoke-tests-checklist)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Ensure the following are installed and accessible before proceeding:

| Requirement | Minimum Version | Notes |
|---|---|---|
| Node.js | 20+ | LTS recommended |
| Supabase CLI | v2.75.0+ | `npm install -g supabase` |
| Git | Any recent version | For cloning and version control |
| Google Cloud account | — | Required for Gemini API key |
| Stripe account | — | Required for billing features |
| Resend account | — | Required for transactional email |

---

## Environment Setup

### 1. Clone the Repository

```bash
git clone https://github.com/jennofrie/CareAxis.git
cd CareAxis
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file and populate your values:

```bash
cp .env.example .env
```

Open `.env` and set the following required variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://jlxfahqfmahrlztiedyd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
NEXT_PUBLIC_APP_VERSION=2.1.0
```

> **Note:** CareAxis uses `.env` (not `.env.local`). All `NEXT_PUBLIC_*` variables must be defined here.

---

## Supabase Setup

### 1. Authenticate with Supabase CLI

```bash
supabase login
```

### 2. Link to the CareAxis Project

```bash
supabase link --project-ref jlxfahqfmahrlztiedyd
```

### 3. Enable pgvector Extension

CareAxis uses pgvector for RAG document embeddings. The extension must reside in the `extensions` schema:

```bash
supabase db execute "CREATE EXTENSION IF NOT EXISTS vector SCHEMA extensions;"
```

> **Important:** Always reference the type as `extensions.vector(768)` in SQL — never `vector(768)` directly.

### 4. Apply All Migrations

Push all 20 migrations to the remote database:

```bash
supabase db push
```

This creates and configures all 13 tables:
`profiles`, `budgets`, `budget_snapshots`, `report_audits`, `plan_management_queries`,
`rag_agent_conversations`, `rag_agent_sessions`, `activity_logs`, `cases`,
`coc_assessments`, `synthesized_reports`, `coc_cover_letter_history`, `document_embeddings`

### 5. Verify No Pending Migrations

```bash
supabase db diff
```

The output should show no pending migrations. If differences appear, review your migration version numbers for uniqueness conflicts.

---

## Edge Functions Deployment

### 1. Set Required Secrets

All secrets must be configured before deploying functions:

```bash
supabase secrets set GEMINI_API_KEY=your_gemini_api_key
supabase secrets set STRIPE_SECRET_KEY=your_stripe_secret_key
supabase secrets set STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
supabase secrets set RESEND_API_KEY=your_resend_api_key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Deploy All Functions

```bash
supabase functions deploy
```

This deploys all 16 edge functions at once.

### 3. Deploy Individual Function (if needed)

```bash
supabase functions deploy function-name
```

### 4. List of All 16 Edge Functions

| # | Function Name | Auth Required |
|---|---|---|
| 1 | `analyze-image` | No |
| 2 | `analyze-text` | No |
| 3 | `analyze-roster` | Yes |
| 4 | `coc-cover-letter-generator` | No |
| 5 | `coc-eligibility-assessor` | Yes |
| 6 | `extract-plan-data` | Yes |
| 7 | `forecast-budget` | No |
| 8 | `generate-embedding` | Yes |
| 9 | `generate-justification` | Yes |
| 10 | `generate-weekly-summary` | Yes |
| 11 | `plan-management-expert` | Yes |
| 12 | `rag-agent` | Yes |
| 13 | `send-budget-alert` | Yes |
| 14 | `senior-planner-audit` | Yes |
| 15 | `suggest-goal-alignment` | Yes |
| 16 | `synthesize-report` | No |

> See [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) for full per-function reference documentation.

---

## Storage Buckets

Storage buckets are not created automatically by migrations. Create them manually in the Supabase Dashboard:

1. Navigate to **Storage** in the Supabase Dashboard for project `jlxfahqfmahrlztiedyd`
2. Create the following buckets:

| Bucket Name | Visibility |
|---|---|
| `justification-attachments` | Private |
| `careaxis-reports` | Private |

> **Note:** Storage access policies are applied automatically via migration `0051_create_storage_policies.sql`. No manual RLS policy setup is required for storage.

---

## Auth Configuration

### Supabase Dashboard Settings

Navigate to **Authentication → Settings** in the Supabase Dashboard:

- **For testing/development:** Disable email confirmation so users can sign in immediately after registration.
- **For production:** Ensure SMTP is configured (e.g., via Resend) so confirmation emails are delivered reliably.

### Domain Restriction

CareAxis enforces that only `@cdssvic.com.au` email addresses can access protected routes. This is enforced in `middleware.ts` and does not require additional dashboard configuration.

### Creating the First User

If no users exist in the project:

1. Go to **Authentication → Users** in the Supabase Dashboard
2. Click **Add User** and create a user with an `@cdssvic.com.au` email address
3. If email confirmation is enabled, confirm the email before attempting to sign in

---

## Development

Start the Next.js development server:

```bash
npm run dev
```

The app runs at **http://localhost:3001** (not the default port 3000).

To run a local Supabase instance (optional):

```bash
supabase start
```

---

## Production Build

Build and start the production server locally:

```bash
npm run build
npm run start
```

The production server also runs at **http://localhost:3001**.

---

## Vercel Deployment (Recommended)

### 1. Deploy to Vercel

```bash
vercel deploy
```

### 2. Configure Environment Variables

In the Vercel Dashboard, add all required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_VERSION`

### 3. Port Configuration

Vercel manages port binding automatically. If running the production build manually on a server, set `PORT=3001` or update the `start` script in `package.json` accordingly.

---

## Smoke Tests Checklist

After deploying, run through the following checks to confirm the application is functioning correctly:

- [ ] Auth page loads at `/auth`
- [ ] Sign up with `@cdssvic.com.au` email works
- [ ] Dashboard is accessible after login
- [ ] Budget Forecaster loads and accepts input
- [ ] Roster Analyzer loads and displays correctly
- [ ] AI feature (e.g., Report Synthesizer) returns a valid response
- [ ] PDF export generates and downloads correctly
- [ ] CSV export generates and downloads correctly
- [ ] RAG Agent responds to a query
- [ ] History panels load previously saved entries

---

## Troubleshooting

### `relation "vector" does not exist`

pgvector was not installed in the correct schema. Always use `extensions.vector(768)` in SQL, not `vector(768)`. Re-run:

```bash
supabase db execute "CREATE EXTENSION IF NOT EXISTS vector SCHEMA extensions;"
```

---

### Auth not working / cannot sign in

- Verify the user exists in the Supabase Dashboard under **Authentication → Users** for project `jlxfahqfmahrlztiedyd`.
- If email confirmation is enabled, ensure the user's email has been confirmed.
- Users from a different Supabase project will not carry over — they must be recreated.

---

### Edge function returns an error

1. Confirm all 5 secrets are set: `supabase secrets list`
2. Check function logs in **Edge Functions → Logs** in the Supabase Dashboard
3. Redeploy the affected function: `supabase functions deploy function-name`

---

### Port conflict on startup

CareAxis runs on port **3001**, not the default 3000. If another process is using 3001:

```bash
lsof -i :3001
kill -9 <PID>
```

Or update the port in `package.json` scripts if needed.

---

### Migrations failing

- Verify all migration filenames use unique version numbers (no duplicate prefixes).
- Run `supabase db diff` to see what the remote database is missing.
- Check that `20260099`, `20260112001`, `20260112002`, `20260113001`, and `20260113002` are present and applied.
- Never reuse migration version numbers.

---

*CareAxis is a product of JD Digital Systems. For internal support, contact the development team via your organisation's standard channels.*
