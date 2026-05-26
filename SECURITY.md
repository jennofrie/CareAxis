# Security Policy

This document outlines the security policy for **CareAxis**, an NDIS B2B SaaS platform developed and maintained by **JD Digital Systems**.

We take the security of CareAxis and the sensitive data it handles seriously. NDIS participant information, plan data, and provider records require the highest standard of care. We appreciate the efforts of the security community in responsibly disclosing vulnerabilities.

> **Repository**: [github.com/jennofrie/CareAxis](https://github.com/jennofrie/CareAxis)

---

## Supported Versions

The following versions of CareAxis are currently receiving security updates:

| Version | Status |
|---|---|
| v2.1.0 (current) | Supported — active security patches |
| < v2.1.0 | Not supported — upgrade strongly recommended |

Only the current production release receives security patches. If you are running an older version, upgrade to v2.1.0 or later.

---

## Reporting a Vulnerability

**Do not open a public GitHub Issue to report a security vulnerability.**

Public disclosure before a fix is available puts CareAxis users and their NDIS participant data at risk. Please follow responsible disclosure practices as described below.

### How to Report

Send a detailed vulnerability report to:

> **security@jddigitalsystems.com.au**

Please include the following in your report:

1. **Description** — A clear explanation of the vulnerability, including the affected component or endpoint
2. **Steps to Reproduce** — A reliable, step-by-step walkthrough
3. **Potential Impact** — Your assessment of what an attacker could achieve (e.g. data exposure, privilege escalation, authentication bypass)
4. **Suggested Fix** — If you have a proposed remediation or mitigation, include it

### Response Commitments

| Milestone | Timeframe |
|---|---|
| Acknowledgement of report | Within 48 hours |
| Initial assessment and timeline estimate | Within 7 business days |
| Notification upon fix deployment | Upon release |

We ask that you keep the vulnerability confidential until we have had a reasonable opportunity to address it. Researchers who follow this policy will receive credit in release notes if desired.

---

## Security Architecture

CareAxis is built with layered security controls designed to protect provider and participant data at every level.

### Row Level Security (RLS)

All 13 database tables have **Row Level Security enabled** via Supabase PostgreSQL policies. Users can only access rows that belong to their own account — enforced at the database level, independent of application logic.

Every table enforces policies of the form:

```sql
USING (auth.uid() = user_id)
```

This means that even if application-level access controls were bypassed, the database would still reject unauthorised data access.

### JWT Authentication

All authenticated routes and edge functions are protected by **JSON Web Tokens (JWT)** issued by Supabase Auth. Tokens are verified server-side on every request. Unauthenticated requests to protected routes and edge functions are rejected before reaching any application logic.

Session tokens are short-lived and automatically refreshed by the Supabase client library.

### Domain Restriction Middleware

CareAxis enforces **email domain restriction** at the middleware layer. Only users with email addresses from the approved domain (`@cdssvic.com.au`) are permitted to access the application. All other domains are blocked before reaching any protected route.

This restriction is applied in Next.js middleware (`lib/supabase/middleware.ts`) on every request — it cannot be bypassed by manipulating route parameters.

### Secrets Management

All sensitive credentials are stored exclusively in the **Supabase secrets manager** and accessed at runtime via `Deno.env.get()`. No secrets are hardcoded in source code or committed to version control.

| Secret | Purpose |
|---|---|
| `GEMINI_API_KEY` | Google Gemini AI service authentication |
| `STRIPE_SECRET_KEY` | Stripe payment processing |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification |
| `RESEND_API_KEY` | Transactional email delivery |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged database access (edge functions only) |

### Service Role Key Restrictions

The `SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS policies and grants full administrative access to the database. It must:

- Never be included in the `.env` file
- Never be referenced in any Next.js page, component, or API route
- Only be used inside Supabase edge functions via `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`
- Never be logged, returned in API responses, or included in error messages

### pgvector Access Control

The `document_embeddings` table stores 768-dimensional vectors generated from participant documents. Access is governed by RLS policies — vector similarity search results only return content belonging to the authenticated user's records.

### Storage Bucket Policies

CareAxis uses two Supabase storage buckets, both configured as **private**:

| Bucket | Purpose |
|---|---|
| `justification-attachments` | NDIS justification supporting documents |
| `careaxis-reports` | Generated PDF reports and exports |

Both buckets enforce access policies that restrict read and write operations to authenticated users with matching ownership credentials. Public access is disabled.

---

## Environment Variable Classification

| Variable | Classification | Rule |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Safe for client-side use — contains no secrets |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Safe for client-side use — governed by RLS |
| `GEMINI_API_KEY` | Secret | Supabase edge function secret only |
| `STRIPE_SECRET_KEY` | Secret | Supabase edge function secret only |
| `STRIPE_WEBHOOK_SECRET` | Secret | Supabase edge function secret only |
| `RESEND_API_KEY` | Secret | Supabase edge function secret only |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Supabase edge function secret only — never client-side |

The `NEXT_PUBLIC_` prefix in Next.js causes variables to be bundled into client-side JavaScript. **Only non-sensitive configuration values** should carry this prefix.

---

## Dependency Security

Keep all dependencies up to date. Audit for known vulnerabilities regularly:

```bash
npm audit
```

Address `high` and `critical` severity advisories promptly. Open a `fix/` branch for dependency patches and follow the standard PR process.

---

## Responsible Disclosure Policy

JD Digital Systems is committed to working with security researchers in good faith. We ask that you:

1. **Report privately** — Use the email address above, not public channels or GitHub Issues
2. **Allow time to respond** — At least 48 hours for acknowledgement and 7 business days for initial assessment
3. **Avoid accessing participant data** — Do not access, modify, or exfiltrate user data. Limit testing to your own accounts and isolated environments
4. **Avoid service disruption** — Do not perform denial-of-service testing or actions that degrade availability for other users
5. **Act in good faith** — We will do the same in return

Researchers who follow this policy will not face legal action for their security research. JD Digital Systems is grateful for responsible disclosure and will credit contributors where appropriate.

---

*Security policy maintained by [JD Digital Systems](https://github.com/jennofrie/CareAxis).*
*Last updated: May 2026*
