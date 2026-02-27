# CareAxis Edge Functions Reference

> Maintained by **JD Digital Systems**
> GitHub: https://github.com/jennofrie/CareAxis
> Last updated: 2026-02-27

---

## Table of Contents

- [Overview](#overview)
- [Function Reference](#function-reference)
- [Required Secrets](#required-secrets)
- [JWT Configuration](#jwt-configuration)
- [Local Development](#local-development)
- [Deployment](#deployment)

---

## Overview

CareAxis ships 16 Deno edge functions deployed on Supabase Edge Functions infrastructure. They handle all server-side AI processing, document analysis, embeddings, email delivery, and billing operations. Functions are located in `supabase/functions/` and are written in TypeScript (Deno runtime).

**Runtime:** Deno (Supabase-managed)
**Region:** AWS ap-south-1
**Project ref:** `jlxfahqfmahrlztiedyd`

---

## Function Reference

### Quick Reference Table

| # | Function | Method | Auth Required | AI Model | Purpose |
|---|---|---|---|---|---|
| 1 | `analyze-image` | POST | No | Gemini 2.0-flash | Analyzes uploaded images for case notes |
| 2 | `analyze-text` | POST | No | Gemini 2.5-flash-preview-05-20 | General text analysis |
| 3 | `analyze-roster` | POST | Yes | Gemini | Roster analysis with penalty rates |
| 4 | `coc-cover-letter-generator` | POST | No | Gemini | Generates Circle of Care cover letters |
| 5 | `coc-eligibility-assessor` | POST | Yes | Gemini | Assesses Circle of Care eligibility |
| 6 | `extract-plan-data` | POST | Yes | Gemini | Extracts structured data from NDIS plan PDFs |
| 7 | `forecast-budget` | POST | No | Gemini | Budget forecasting and projections |
| 8 | `generate-embedding` | POST | Yes | Gemini Embeddings | Generates 768-dimension pgvector embeddings |
| 9 | `generate-justification` | POST | Yes | Gemini 2.5-flash-preview-05-20 | NDIS justification drafting |
| 10 | `generate-weekly-summary` | POST | Yes | Gemini 2.0-flash | Weekly case summary generation |
| 11 | `plan-management-expert` | POST | Yes | Gemini | Plan management analysis and advice |
| 12 | `rag-agent` | POST | Yes | Gemini + pgvector | RAG chatbot with document retrieval |
| 13 | `send-budget-alert` | POST | Yes | — (Resend email) | Budget threshold alert emails |
| 14 | `senior-planner-audit` | POST | Yes | Gemini 2.5-pro | Comprehensive senior planner audit |
| 15 | `suggest-goal-alignment` | POST | Yes | Gemini | NDIS goal alignment suggestions |
| 16 | `synthesize-report` | POST | No | Gemini | Report synthesis from multiple sources |

---

### Detailed Function Descriptions

---

#### 1. `analyze-image`

| Property | Value |
|---|---|
| Method | POST |
| Auth Required | No (`verify_jwt = false`) |
| AI Model | Gemini 2.0-flash |
| Path | `supabase/functions/analyze-image/` |

Accepts a base64-encoded image payload and uses Gemini's multimodal vision capabilities to extract relevant information for NDIS case notes. Suitable for uploading support worker photographs, documents, or medical imagery for structured analysis.

**Request body:**
```json
{
  "image": "<base64 string>",
  "mimeType": "image/jpeg",
  "prompt": "Optional additional context or instruction"
}
```

---

#### 2. `analyze-text`

| Property | Value |
|---|---|
| Method | POST |
| Auth Required | No (`verify_jwt = false`) |
| AI Model | Gemini 2.5-flash-preview-05-20 |
| Path | `supabase/functions/analyze-text/` |

General-purpose text analysis endpoint. Processes unstructured text input and returns structured analysis. Used internally by multiple front-end features.

**Request body:**
```json
{
  "text": "Input text to analyse",
  "instruction": "Optional instruction for the model"
}
```

---

#### 3. `analyze-roster`

| Property | Value |
|---|---|
| Method | POST |
| Auth Required | Yes (`verify_jwt = true`) |
| AI Model | Gemini |
| Path | `supabase/functions/analyze-roster/` |

Analyzes uploaded roster data (CSV or JSON) to identify staffing patterns, shift distributions, and penalty rate implications. Supports a penalty rate toggle to optionally include Fair Work Act penalty calculations in the analysis output.

**Request body:**
```json
{
  "rosterData": [...],
  "includePenaltyRates": true
}
```

---

#### 4. `coc-cover-letter-generator`

| Property | Value |
|---|---|
| Method | POST |
| Auth Required | No (`verify_jwt = false`) |
| AI Model | Gemini |
| Path | `supabase/functions/coc-cover-letter-generator/` |

Generates professional Circle of Care (CoC) cover letters based on participant details, goals, and support context. Output is stored in the `coc_cover_letter_history` table and also cached to avoid redundant generation for identical inputs.

**Request body:**
```json
{
  "participantName": "...",
  "goals": [...],
  "supportContext": "..."
}
```

---

#### 5. `coc-eligibility-assessor`

| Property | Value |
|---|---|
| Method | POST |
| Auth Required | Yes (`verify_jwt = true`) |
| AI Model | Gemini |
| Path | `supabase/functions/coc-eligibility-assessor/` |

Assesses a participant's eligibility for Circle of Care supports against NDIS criteria. Results are stored in the `coc_assessments` table linked to the authenticated user's case records.

**Request body:**
```json
{
  "caseId": "uuid",
  "assessmentData": {...}
}
```

---

#### 6. `extract-plan-data`

| Property | Value |
|---|---|
| Method | POST |
| Auth Required | Yes (`verify_jwt = true`) |
| AI Model | Gemini |
| Path | `supabase/functions/extract-plan-data/` |

Extracts structured data from NDIS plan PDF documents. Parses plan periods, funding categories, budget amounts, and support objectives into structured JSON suitable for import into the budget forecasting system.

**Request body:**
```json
{
  "pdfBase64": "<base64 encoded PDF>",
  "caseId": "uuid"
}
```

---

#### 7. `forecast-budget`

| Property | Value |
|---|---|
| Method | POST |
| Auth Required | No (`verify_jwt = false`) |
| AI Model | Gemini |
| Path | `supabase/functions/forecast-budget/` |

Performs budget forecasting and projection calculations for NDIS participants. Accepts current budget data, spending history, and plan dates to generate forward-looking utilisation projections and alerts.

**Request body:**
```json
{
  "budgetData": {...},
  "planStartDate": "YYYY-MM-DD",
  "planEndDate": "YYYY-MM-DD"
}
```

---

#### 8. `generate-embedding`

| Property | Value |
|---|---|
| Method | POST |
| Auth Required | Yes (`verify_jwt = true`) |
| AI Model | Gemini Embeddings API |
| Path | `supabase/functions/generate-embedding/` |

Generates 768-dimensional vector embeddings for text content using the Gemini Embeddings model. Embeddings are stored in the `document_embeddings` table using the `extensions.vector(768)` column type and are used by the RAG agent for semantic similarity search.

**Request body:**
```json
{
  "text": "Content to embed",
  "documentId": "uuid"
}
```

> **Important:** The pgvector extension must be installed in the `extensions` schema. The column type must be declared as `extensions.vector(768)`.

---

#### 9. `generate-justification`

| Property | Value |
|---|---|
| Method | POST |
| Auth Required | Yes (`verify_jwt = true`) |
| AI Model | Gemini 2.5-flash-preview-05-20 |
| Path | `supabase/functions/generate-justification/` |

Drafts NDIS funding justification documents based on participant support needs, goals, and evidence provided. Output can be attached to cases and exported as PDF. Related attachments are stored in the `justification-attachments` storage bucket.

**Request body:**
```json
{
  "caseId": "uuid",
  "supportNeeds": [...],
  "goals": [...],
  "evidence": "..."
}
```

---

#### 10. `generate-weekly-summary`

| Property | Value |
|---|---|
| Method | POST |
| Auth Required | Yes (`verify_jwt = true`) |
| AI Model | Gemini 2.0-flash |
| Path | `supabase/functions/generate-weekly-summary/` |

Generates a structured weekly case summary based on case notes, activities, and events from the preceding 7 days. Summaries are persisted in localStorage on the client and paginated for the history panel display.

**Request body:**
```json
{
  "caseId": "uuid",
  "weekEndingDate": "YYYY-MM-DD",
  "caseNotes": [...]
}
```

---

#### 11. `plan-management-expert`

| Property | Value |
|---|---|
| Method | POST |
| Auth Required | Yes (`verify_jwt = true`) |
| AI Model | Gemini |
| Path | `supabase/functions/plan-management-expert/` |

Provides expert-level analysis and recommendations on NDIS plan management scenarios. Responses are stored in the `plan_management_queries` table, enabling the history panel on the Plan Management Expert page to display previous queries.

**Request body:**
```json
{
  "query": "Plan management question or scenario",
  "context": "Optional additional context"
}
```

---

#### 12. `rag-agent`

| Property | Value |
|---|---|
| Method | POST |
| Auth Required | Yes (`verify_jwt = true`) |
| AI Model | Gemini + pgvector |
| Path | `supabase/functions/rag-agent/` |

Retrieval-Augmented Generation chatbot. Accepts a user query, performs a vector similarity search against `document_embeddings` using pgvector, retrieves the most relevant document chunks, and passes them as context to Gemini for grounded response generation. Conversation history is stored in `rag_agent_conversations` and sessions in `rag_agent_sessions`.

**Request body:**
```json
{
  "query": "User question",
  "sessionId": "uuid"
}
```

---

#### 13. `send-budget-alert`

| Property | Value |
|---|---|
| Method | POST |
| Auth Required | Yes (`verify_jwt = true`) |
| AI Model | — |
| Path | `supabase/functions/send-budget-alert/` |

Sends transactional budget threshold alert emails via the Resend API. Triggered when a participant's budget utilisation crosses a configured threshold. Does not invoke an AI model — it is a pure email dispatch function.

**Request body:**
```json
{
  "recipientEmail": "user@cdssvic.com.au",
  "participantName": "...",
  "budgetCategory": "...",
  "utilizationPercent": 85
}
```

---

#### 14. `senior-planner-audit`

| Property | Value |
|---|---|
| Method | POST |
| Auth Required | Yes (`verify_jwt = true`) |
| AI Model | Gemini 2.5-pro |
| Path | `supabase/functions/senior-planner-audit/` |

Performs a comprehensive senior planner audit of an NDIS participant's case. Uses Gemini 2.5-pro (the highest-capability model in the stack) for thorough assessment. Audit results are stored in both `synthesized_reports` and `coc_assessments`, making them accessible from both the Senior Planner and CoC history panels.

**Request body:**
```json
{
  "caseId": "uuid",
  "auditScope": "full",
  "includeCoC": true
}
```

---

#### 15. `suggest-goal-alignment`

| Property | Value |
|---|---|
| Method | POST |
| Auth Required | Yes (`verify_jwt = true`) |
| AI Model | Gemini |
| Path | `supabase/functions/suggest-goal-alignment/` |

Analyses a participant's stated goals against their NDIS plan funding categories and suggests alignment improvements. Helps support coordinators ensure funded supports map correctly to participant goals as required under NDIS practice standards.

**Request body:**
```json
{
  "caseId": "uuid",
  "goals": [...],
  "fundingCategories": [...]
}
```

---

#### 16. `synthesize-report`

| Property | Value |
|---|---|
| Method | POST |
| Auth Required | No (`verify_jwt = false`) |
| AI Model | Gemini |
| Path | `supabase/functions/synthesize-report/` |

Synthesizes a cohesive report from multiple source documents or data inputs. Output is stored in the `synthesized_reports` table and surfaced in the Report Synthesizer history panel. Reports can be exported as PDF via `lib/pdfExportFeatures.ts`.

**Request body:**
```json
{
  "sources": [...],
  "reportTitle": "...",
  "instructions": "Optional synthesis guidance"
}
```

---

## Required Secrets

All secrets must be configured via the Supabase CLI before deploying or invoking functions. Missing secrets will cause runtime errors.

```bash
supabase secrets set GEMINI_API_KEY=your_gemini_api_key
supabase secrets set STRIPE_SECRET_KEY=your_stripe_secret_key
supabase secrets set STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
supabase secrets set RESEND_API_KEY=your_resend_api_key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

To verify secrets are set:

```bash
supabase secrets list
```

| Secret | Used By |
|---|---|
| `GEMINI_API_KEY` | All AI functions (1–12, 14–16) |
| `STRIPE_SECRET_KEY` | Billing-related functions |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification |
| `RESEND_API_KEY` | `send-budget-alert` |
| `SUPABASE_SERVICE_ROLE_KEY` | Functions requiring admin database access |

---

## JWT Configuration

JWT verification is configured per-function in `supabase/config.toml`. Functions with `verify_jwt = false` do not require a Bearer token in the `Authorization` header.

### `verify_jwt = false` (no auth token required)

- `synthesize-report`
- `analyze-image`
- `analyze-text`
- `coc-cover-letter-generator`
- `forecast-budget`

### `verify_jwt = true` (Bearer token required)

All remaining 11 functions require a valid Supabase JWT passed as:

```
Authorization: Bearer <supabase_access_token>
```

The access token is obtained from the Supabase Auth session on the client.

---

## Local Development

### Serve All Functions Locally

```bash
supabase functions serve --env-file .env
```

Functions will be available at `http://localhost:54321/functions/v1/`.

### Test a Function with curl

```bash
# Public function (no auth)
curl -X POST http://localhost:54321/functions/v1/synthesize-report \
  -H "Content-Type: application/json" \
  -d '{"sources": [], "reportTitle": "Test Report"}'

# Authenticated function
curl -X POST http://localhost:54321/functions/v1/analyze-roster \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_access_token>" \
  -d '{"rosterData": [], "includePenaltyRates": true}'
```

### Serve a Single Function

```bash
supabase functions serve analyze-image --env-file .env
```

---

## Deployment

### Deploy All Functions

```bash
supabase functions deploy
```

### Deploy a Single Function

```bash
supabase functions deploy function-name
```

Replace `function-name` with any of the 16 function names listed in the [Function Reference](#function-reference) table.

### Verify Deployment

After deploying, confirm functions are live in the Supabase Dashboard under **Edge Functions**. Each function should display a green status indicator and a recent deployment timestamp.

To view real-time logs for a deployed function:

```bash
supabase functions logs function-name --tail
```

---

*CareAxis is a product of JD Digital Systems. For internal support, contact the development team via your organisation's standard channels.*
