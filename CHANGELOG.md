# Changelog

All notable changes to CareAxis will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> Maintained by **JD Digital Systems** — [github.com/jennofrie/CareAxis](https://github.com/jennofrie/CareAxis)

---

## [Unreleased]

### Added

- **QuantumSign e-signature module** — end-to-end document signing system
  - Main dashboard with five tabs: Start, Inbox, Sent, Completed, My Templates
  - Public signing page (`/sign/{token}`) — unauthenticated recipients can review and sign documents without an account
  - Click-to-place signature positioning on PDF page canvas
  - Canvas-based signature drawing pad via `react-signature-canvas`
  - PDF rendering with zoom controls and multi-page navigation via `pdfjs-dist`
  - Signature request lifecycle management: create, cancel, remind, delete, download
  - Real-time status tracking: `PENDING`, `VIEWED`, `SIGNED`, `DECLINED`, `EXPIRED`
  - Email notifications via Resend for all status transitions (request sent, reminder, signed, declined)
  - Server-side PDF merging with `pdf-lib` — signature embedded directly into the document
  - Signer IP address and user-agent recorded as audit trail
  - New edge functions: `quantum-sign` (authenticated CRUD) and `quantum-sign-public` (token-based public signing)
  - 11 new components in `components/quantum-sign/`
  - `useSignatureRequests` hook with TanStack Query integration
  - QuantumSign added to dashboard sidebar navigation

- **Landing UI refresh** — modernised dark theme with particle hover-connect background and refined typography via `@tsparticles/react` and `@tsparticles/slim`

---

## [2.1.0] — 2026-02-27

### Added

- **Budget Forecaster**: CSV export for forecast projection data via PapaParse
- **Victoria Public Holidays**: `lib/victoriaHolidays.ts` calendar for accurate Fair Work Act penalty rate calculations
- **Roster Analyzer**: Victoria penalty rate toggle, `PenaltyStats` card component, Export CSV and Export PDF buttons
- **PDF Export**: full-featured PDF generation for all 8 major tools via `lib/pdfExport.ts` and `lib/pdfExportFeatures.ts` (jsPDF + jspdf-autotable)
  - `exportBudgetForecastPDF`
  - `exportRosterAnalysisPDF`
  - `exportJustificationPDF`
  - `exportReportSynthesisPDF`
  - `exportPlanManagementPDF`
  - `exportCoCLetterPDF`
  - `exportSeniorPlannerPDF`
  - `exportWeeklySummaryPDF`
- **History Panels**: persistent history for all AI-powered features
  - Report Synthesizer — `synthesized_reports` table
  - Plan Management Expert — `plan_management_queries` table
  - CoC Cover Letter Generator — `coc_cover_letter_history` table with server-side caching
  - Senior Planner Audit — dual history from `synthesized_reports` + `coc_assessments`
  - Visual Case Notes — `localStorage`, paginated
  - Weekly Summary — `localStorage`, paginated
- **GeneratingOverlay** component: animated brain, ping indicator, and dots; 50 NDIS-specific loading tips; 7 per-feature status message variants
- **Sheet.tsx** component: reusable slide-over panel primitive
- **Toaster** (Sonner): wired into root layout for global toast notifications
- Dependencies: `jspdf`, `jspdf-autotable`, `sonner`, `papaparse`, `recharts`

### Changed

- Migrated from legacy Spectra project (`xogkgedxhwlgeclmaqmu`, AWS ap-southeast-2) to CareAxis Supabase project (`jlxfahqfmahrlztiedyd`, AWS ap-south-1)
- All storage bucket references updated from legacy names to `careaxis-reports` and `justification-attachments`
- pgvector extension correctly qualified via `extensions` schema (`extensions.vector(768)`) to prevent public schema conflicts

### Fixed

- Auth flow: email confirmation deep links now correctly handled via `/auth/callback` route handler (`app/auth/callback/route.ts`)
- RLS policies updated to reference the new Supabase project

---

## [2.0.0] — 2026-01-15

### Added

- **RAG Agent**: document ingestion pipeline with pgvector embeddings (768-dimensional vectors generated via Google Gemini Embeddings API)
- **CoC Cover Letter Generator**: AI-generated Circle of Care letters with save history and server-side caching (`coc_cover_letter_history` table)
- **CoC Eligibility Assessor**: structured NDIS eligibility assessment workflow
- **Senior Planner Audit**: dual-history output stored across `synthesized_reports` and `coc_assessments`
- `cases` table for NDIS participant case management (participant info, goals, functional impairments, plan dates)
- `activity_logs` table for full system-wide audit trail
- Performance indexes migration for query optimisation across high-traffic tables
- `document_embeddings` table using pgvector (`extensions.vector(768)`) for semantic search

---

## [1.5.0] — 2025-12-01

### Added

- **Plan Management Expert**: AI-powered analytics with query persistence (`plan_management_queries` table)
- **Report Synthesizer**: structured AI report generation with save history (`synthesized_reports` table)
- **Visual Case Notes**: rich case note editor with localStorage persistence and pagination
- **Weekly Summary**: automated weekly summary reports with localStorage persistence and pagination

---

## [1.0.0] — 2025-11-01

### Added

- Initial CareAxis release, migrated and rebranded from the Spectra codebase
- Supabase Auth with JWT-based sessions and domain restriction (`@cdssvic.com.au` only)
- Core tools: Dashboard, Budget Forecaster, Justification Drafter
- Roster Analyzer (base version, penalty rate support not yet included)
- 16 Deno edge functions deployed to Supabase for AI processing, billing, and email
- 13 PostgreSQL tables with Row Level Security enforced on all
- Stripe subscription billing integration
- Resend transactional email integration
- Google Gemini AI integration (`gemini-2.0-flash`, `gemini-2.5-flash-preview-05-20`)
