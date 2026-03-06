# Changelog

All notable changes to CareAxis will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Maintained by **JD Digital Systems** — https://github.com/jennofrie/CareAxis

---

## [Unreleased]

### Added
- **QuantumSign e-signature module** — complete document signing system
  - Main dashboard with 5 tabs: Start, Inbox, Sent, Completed, My Templates
  - Public signing page (`/sign/{token}`) — unauthenticated recipients can review and sign documents
  - Click-to-place signature positioning on PDF pages
  - Canvas-based signature drawing pad
  - PDF rendering with zoom controls and multi-page navigation
  - Signature request management: create, cancel, remind, delete, download
  - Real-time status tracking: PENDING, VIEWED, SIGNED, DECLINED, EXPIRED
  - Email notifications via Resend (request, reminder, signed, declined)
  - Server-side PDF merging using pdf-lib (signature embedded into PDF)
  - Signer IP and user-agent audit trail
- New edge functions: `quantum-sign` (authenticated CRUD) and `quantum-sign-public` (token-based public signing)
- New dependency: `react-signature-canvas` for signature drawing
- QuantumSign added to dashboard sidebar navigation
- 11 new components in `src/components/quantum-sign/`
- `useSignatureRequests` hook with TanStack Query integration

---

## [2.1.0] - 2026-02-27

### Added

- **Budget Forecaster**: CSV export functionality for forecast data
- **Victoria Public Holidays**: `lib/victoriaHolidays.ts` calendar for accurate penalty rate calculations
- **Roster Analyzer**: penalty rate toggle, PenaltyStats card, Export CSV button, Export PDF button
- **PDF Export**: full PDF generation for all 8 major features via `lib/pdfExport.ts` and `lib/pdfExportFeatures.ts` (jsPDF + jspdf-autotable)
- **History Panels**: persistent history for all AI-powered features:
  - Report Synthesizer (`synthesized_reports` table)
  - Plan Management Expert (`plan_management_queries` table)
  - CoC Cover Letter Generator (`coc_cover_letter_history` table with caching)
  - Senior Planner Audit (dual history: `synthesized_reports` + `coc_assessments`)
  - Visual Case Notes (localStorage, paginated)
  - Weekly Summary (localStorage, paginated)
- **GeneratingOverlay** component (`components/ui/GeneratingOverlay.tsx`): animated brain + ping + dots, 50 NDIS-specific loading tips, 7 status messages per feature variant
- **Sheet.tsx** component (`components/ui/Sheet.tsx`): reusable modal/side-panel primitive
- **Toaster** (sonner): wired into root layout for global toast notifications
- Dependencies installed: `jspdf`, `jspdf-autotable`, `sonner`, `papaparse`, `recharts`

### Changed

- Migrated from legacy Spectra project (`xogkgedxhwlgeclmaqmu`, AWS ap-southeast-2) to new CareAxis Supabase project (`jlxfahqfmahrlztiedyd`, AWS ap-south-1)
- Updated all storage bucket references from old bucket names to `careaxis-reports` and `justification-attachments`
- pgvector extension now correctly referenced via `extensions` schema (`extensions.vector(768)`) to avoid conflicts with the public schema

### Fixed

- Auth flow: email confirmation deep links now handled correctly via `/auth/callback` route (`app/auth/callback/route.ts`)
- RLS (Row Level Security) policies updated to reflect new Supabase project reference

---

## [2.0.0] - 2026-01-15

### Added

- **RAG Agent**: document ingestion pipeline with pgvector embeddings (768-dimensional, generated via Google Gemini)
- **CoC Cover Letter Generator**: AI-generated letters with save history and caching (`coc_cover_letter_history` table)
- **CoC Eligibility Assessor**: structured eligibility assessment workflow
- **Senior Planner Audit**: dual-history output stored across `synthesized_reports` and `coc_assessments`
- `cases` table for NDIS participant case management (participant info, goals, functional impairments, plan dates)
- `activity_logs` table for full audit trail tracking
- Performance indexes migration for query optimisation across high-traffic tables
- `document_embeddings` table using pgvector (`extensions.vector(768)`) for semantic search

---

## [1.5.0] - 2025-12-01

### Added

- **Plan Management Expert**: AI-powered analytics with query persistence (`plan_management_queries` table)
- **Report Synthesizer**: structured AI report generation with save history (`synthesized_reports` table)
- **Visual Case Notes**: rich case note editor with localStorage persistence and pagination
- **Weekly Summary**: automated weekly summary reports with localStorage persistence and pagination

---

## [1.0.0] - 2025-11-01

### Added

- Initial CareAxis release, migrated from the Spectra codebase
- Supabase Auth with JWT-based sessions and domain restriction (`@cdssvic.com.au` emails only)
- Core features: Dashboard, Budget Forecaster, Justification Drafter
- Roster Analyzer (base version, no penalty rate support)
- 16 Deno Edge Functions deployed to Supabase (AI, billing, email)
- 13 database tables with Row Level Security (RLS) enforced
- Stripe billing integration (subscription management)
- Resend email integration (transactional email)
- Google Gemini AI integration (`gemini-2.0-flash`, `gemini-2.5-flash-preview-05-20`)
