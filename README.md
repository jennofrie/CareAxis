# CareAxis

![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)
![React](https://img.shields.io/badge/React-19-61DAFB.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6.svg)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E.svg)
![License](https://img.shields.io/badge/license-Proprietary-red.svg)

> A professional B2B SaaS toolkit for NDIS (National Disability Insurance Scheme) service providers — built to streamline planning, reporting, compliance, and budget management workflows.

**Maintained by [JD Digital Systems](https://github.com/jennofrie/CareAxis)**

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Edge Functions](#edge-functions)
- [Storage Buckets](#storage-buckets)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Architecture Notes](#architecture-notes)
- [Contributing](#contributing)

---

## Overview

CareAxis is a secure, multi-tenant B2B SaaS platform designed for NDIS service providers and support coordinators. It provides AI-assisted workflows for report synthesis, plan management, justification drafting, budget forecasting, roster analysis, and more.

- **Version**: 2.1.0
- **Target Users**: NDIS support coordinators, plan managers, senior planners
- **Access Control**: Restricted to `@cdssvic.com.au` email domain
- **Region**: AWS ap-south-1 (Supabase project: `jlxfahqfmahrlztiedyd`)
- **Dev Port**: 3001

---

## Features

CareAxis provides 13 purpose-built pages and tools:

| # | Page | Description | Storage |
|---|------|-------------|---------|
| 1 | **Dashboard** | Main overview and activity summary | — |
| 2 | **Report Synthesizer** | Synthesizes NDIS progress and functional reports | `synthesized_reports` |
| 3 | **Senior Planner** | Senior planner audit tool with dual history | `synthesized_reports` + `coc_assessments` |
| 4 | **Plan Management Expert** | Plan management analytics and query history | `plan_management_queries` |
| 5 | **CoC Cover Letter Generator** | Circle of Care cover letter generation with caching | `coc_cover_letter_history` |
| 6 | **CoC Eligibility Assessor** | Circle of Care eligibility check and recommendations | — |
| 7 | **Justification Drafter** | NDIS support justification generator with file upload | `justification-attachments` bucket |
| 8 | **Budget Forecaster** | Budget forecasting with CSV export | `budgets` + `budget_snapshots` |
| 9 | **Roster Analyzer** | Roster analysis with Victoria penalty rates toggle, CSV/PDF export | — |
| 10 | **Visual Case Notes** | Rich case notes editor with pagination | `localStorage` |
| 11 | **Weekly Summary** | Weekly summary report generator with pagination | `localStorage` |
| 12 | **RAG Agent** | AI chatbot with retrieval-augmented generation using pgvector | `rag_agent_conversations` + `rag_agent_sessions` |
| 13 | **Watch Demo** | Guided product walkthrough | — |

### Key Capabilities

- **AI-Assisted Report Generation** — Powered by Google Gemini models for intelligent NDIS documentation
- **Budget Forecasting** — Predict NDIS budget consumption and alert on anomalies
- **Roster Penalty Rate Analysis** — Victoria-specific penalty rate toggle with CSV and PDF export
- **RAG Agent** — Retrieval-augmented generation chatbot with 768-dimensional pgvector embeddings
- **PDF Export** — Export all major reports to PDF via jsPDF + jspdf-autotable
- **CSV Export** — Roster and budget data export via Papa Parse
- **History Panels** — Per-feature history with caching and pagination
- **Animated Loading Overlay** — 50 NDIS-specific tips with per-variant status messages
- **Dark/Light Theme** — Full theme support via ThemeProvider

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15 | App Router, SSR/SSG |
| React | 19 | UI framework |
| TypeScript | 5.7 | Type safety |
| Tailwind CSS | latest | Utility-first styling |
| shadcn/ui | latest | Component library |
| Chart.js | latest | Data visualisation |
| Recharts | latest | Declarative charting |
| jsPDF | latest | PDF generation |
| jspdf-autotable | latest | PDF table rendering |
| Papa Parse | latest | CSV parsing and export |
| Sonner | latest | Toast notifications |

### Backend

| Technology | Purpose |
|------------|---------|
| Supabase (PostgreSQL) | Primary database with RLS |
| pgvector (768-dim) | Semantic search and embeddings |
| Supabase Auth (JWT) | Authentication and session management |
| Deno Edge Functions (16) | Serverless AI and business logic |
| Supabase Storage | File uploads and report storage |

### AI / Integrations

| Service | Usage |
|---------|-------|
| Google Gemini `gemini-2.0-flash` | Fast document analysis and generation |
| Google Gemini `gemini-2.5-flash-preview-05-20` | Enhanced flash inference |
| Google Gemini `gemini-2.5-pro` | Complex report synthesis and senior planning |
| Stripe | Subscription billing and webhook handling |
| Resend | Transactional email delivery |

---

## Project Structure

```
CareAxis/
├── app/                            # Next.js 15 App Router
│   ├── (authenticated)/            # Protected routes (require auth)
│   │   ├── dashboard/
│   │   ├── report-synthesizer/
│   │   ├── senior-planner/
│   │   ├── plan-management-expert/
│   │   ├── coc-cover-letter/
│   │   ├── coc-eligibility-assessor/
│   │   ├── justification-drafter/
│   │   ├── budget-forecaster/
│   │   ├── roster-analyzer/
│   │   ├── visual-case-notes/
│   │   ├── weekly-summary/
│   │   ├── rag-agent/
│   │   └── watch-demo/
│   ├── auth/                       # Sign in / sign up pages
│   └── auth/callback/              # Email confirmation route handler
│       └── route.ts
├── components/                     # Shared UI components
│   ├── layout/                     # Header, Sidebar navigation
│   ├── providers/                  # ThemeProvider
│   └── ui/                         # shadcn/ui components
│       ├── GeneratingOverlay.tsx   # Animated AI loading overlay
│       ├── Sheet.tsx               # Slide-over panel component
│       └── ...                     # Button, Card, Dialog, etc.
├── hooks/                          # Custom React hooks
├── lib/                            # Utility libraries
│   ├── supabase/
│   │   ├── client.ts               # Browser Supabase client
│   │   ├── server.ts               # Server-side Supabase client
│   │   └── middleware.ts           # Auth middleware + domain enforcement
│   ├── pdfExport.ts                # Core PDF export utilities
│   ├── pdfExportFeatures.ts        # 8 feature-specific PDF exporters
│   ├── rosterExport.ts             # Roster CSV/PDF export logic
│   └── victoriaHolidays.ts         # Victoria public holiday definitions
├── supabase/
│   ├── config.toml                 # Supabase project config
│   ├── migrations/                 # 20 SQL migration files (fully synced)
│   └── functions/                  # 16 Deno edge functions
├── .env                            # Environment variables (NEXT_PUBLIC_*)
├── .env.example                    # Example env file for setup
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Database Schema

CareAxis uses 13 PostgreSQL tables with Row-Level Security (RLS) enforced on all tables.

| Table | Purpose |
|-------|---------|
| `profiles` | User profile data linked to Supabase Auth (`id`, `subscription_tier`, `created_at`, `updated_at`) |
| `budgets` | NDIS budget records per participant/case |
| `budget_snapshots` | Point-in-time budget snapshots for forecasting |
| `report_audits` | Audit log for generated reports |
| `plan_management_queries` | Plan Management Expert query history |
| `rag_agent_conversations` | Individual RAG agent conversation messages |
| `rag_agent_sessions` | RAG agent session groupings |
| `activity_logs` | System-wide activity and event logs |
| `cases` | Participant case records |
| `coc_assessments` | Circle of Care eligibility assessment results |
| `synthesized_reports` | Report Synthesizer and Senior Planner outputs |
| `coc_cover_letter_history` | CoC cover letter generation history with caching |
| `document_embeddings` | pgvector 768-dimensional document embeddings for RAG |

### pgvector Note

pgvector is installed in the `extensions` schema. Always reference it as:

```sql
extensions.vector(768)
```

Do **not** use `vector(768)` without the schema prefix, as this will cause migration failures.

---

## Edge Functions

CareAxis deploys 16 Deno edge functions to Supabase:

| Function | Purpose |
|----------|---------|
| `analyze-image` | Image analysis for attachments |
| `analyze-roster` | Roster data analysis with penalty rate support |
| `analyze-text` | General text analysis |
| `coc-cover-letter-generator` | Circle of Care cover letter generation |
| `coc-eligibility-assessor` | Circle of Care eligibility determination |
| `extract-plan-data` | NDIS plan data extraction |
| `forecast-budget` | Budget forecasting and anomaly detection |
| `generate-embedding` | 768-dim vector embedding generation |
| `generate-justification` | NDIS support justification drafting |
| `generate-weekly-summary` | Weekly summary report generation |
| `plan-management-expert` | Plan management analytics and advice |
| `rag-agent` | RAG chatbot with pgvector retrieval |
| `send-budget-alert` | Budget threshold alert emails via Resend |
| `senior-planner-audit` | Senior planner audit report generation |
| `suggest-goal-alignment` | NDIS goal alignment suggestions |
| `synthesize-report` | Multi-source NDIS report synthesis |

---

## Storage Buckets

| Bucket | Purpose |
|--------|---------|
| `justification-attachments` | File uploads for the Justification Drafter (supporting documents) |
| `careaxis-reports` | Generated report files and exports |

---

## Environment Variables

### Application (`.env`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://jlxfahqfmahrlztiedyd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_APP_VERSION=2.1.0
```

### Supabase Edge Function Secrets

Set these via the Supabase dashboard or CLI (`supabase secrets set`):

```env
GEMINI_API_KEY=your_gemini_api_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
RESEND_API_KEY=your_resend_api_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Copy `.env.example` to `.env` and populate all values before running the application.

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm or pnpm
- Supabase CLI (`npm install -g supabase`)
- Access to the Supabase project `jlxfahqfmahrlztiedyd`

### Local Development Setup

**1. Clone the repository**

```bash
git clone https://github.com/jennofrie/CareAxis.git
cd CareAxis
```

**2. Install dependencies**

```bash
npm install
```

**3. Configure environment variables**

```bash
cp .env.example .env
# Edit .env and fill in your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**4. Link to the Supabase project**

```bash
supabase link --project-ref jlxfahqfmahrlztiedyd
```

**5. Apply database migrations**

```bash
supabase db push
```

This applies all 20 SQL migrations to your remote Supabase project.

**6. Deploy all edge functions**

```bash
supabase functions deploy
```

This deploys all 16 Deno edge functions.

**7. Set Supabase secrets**

```bash
supabase secrets set GEMINI_API_KEY=your_value
supabase secrets set STRIPE_SECRET_KEY=your_value
supabase secrets set STRIPE_WEBHOOK_SECRET=your_value
supabase secrets set RESEND_API_KEY=your_value
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_value
```

**8. Start the development server**

```bash
npm run dev
```

The application runs at [http://localhost:3001](http://localhost:3001).

---

## Deployment

### Production Build

```bash
npm run build
npm start
```

The production server also runs on port 3001.

### Supabase Configuration Checklist

Before going live, verify the following in the Supabase dashboard for project `jlxfahqfmahrlztiedyd`:

- [ ] Email confirmation is disabled **or** users have confirmed their email
- [ ] RLS policies are enabled on all 13 tables
- [ ] Storage bucket policies are configured for `justification-attachments` and `careaxis-reports`
- [ ] All 5 edge function secrets are set
- [ ] Stripe webhook endpoint is configured to point to the `send-budget-alert` function URL
- [ ] pgvector extension is enabled under the `extensions` schema

---

## Architecture Notes

### Authentication and Domain Enforcement

- Authentication is handled by Supabase Auth using JWTs
- Middleware enforces `@cdssvic.com.au` email domain restriction on all protected routes
- The `/auth/callback/route.ts` handler processes Supabase email confirmation redirect links
- Email confirmation must be disabled in the Supabase dashboard, or users must confirm their email before the first login succeeds

### pgvector and RAG

- The `document_embeddings` table stores 768-dimensional vectors using `extensions.vector(768)`
- The `generate-embedding` edge function produces embeddings via the Gemini API
- The `rag-agent` edge function performs cosine similarity search against stored embeddings for retrieval-augmented generation

### History and Caching

- **Report Synthesizer**: Saves to `synthesized_reports` with full history panel
- **Senior Planner**: Dual history from both `synthesized_reports` and `coc_assessments`
- **Plan Management Expert**: History from `plan_management_queries`
- **CoC Cover Letter**: History from `coc_cover_letter_history` with server-side caching to avoid duplicate generation
- **Visual Case Notes** and **Weekly Summary**: Paginated history stored in `localStorage`

### PDF and CSV Export

- `lib/pdfExport.ts` — Core PDF export utilities (page setup, headers, footers, branding)
- `lib/pdfExportFeatures.ts` — 8 feature-specific PDF exporters (one per tool)
- `lib/rosterExport.ts` — Roster CSV and PDF export logic
- `lib/victoriaHolidays.ts` — Victoria public holiday definitions for penalty rate calculations

### Budget Forecaster

- Reads from `budgets` and `budget_snapshots` tables
- The `forecast-budget` edge function performs projection calculations
- Supports CSV export of forecast data
- Sends budget threshold alerts via the `send-budget-alert` edge function using Resend

---

## Contributing

CareAxis is a proprietary product maintained by **JD Digital Systems**. External contributions are not accepted without prior written agreement.

For bug reports or feature requests, contact the maintainer via the [GitHub repository](https://github.com/jennofrie/CareAxis).

---

## License

Copyright (c) 2026 JD Digital Systems. All rights reserved.

This software is proprietary and confidential. Unauthorised copying, distribution, modification, or use of this software, via any medium, is strictly prohibited without the express written permission of JD Digital Systems.

---

*CareAxis v2.1.0 — Built by [JD Digital Systems](https://github.com/jennofrie/CareAxis)*
