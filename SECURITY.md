# Security Policy

This document outlines the security policy for **CareAxis**, an NDIS B2B SaaS toolkit developed and maintained by **JD Digital Systems**.

We take the security of CareAxis and the sensitive data it handles seriously. NDIS participant information, plan data, and provider records require the highest standard of care. We appreciate the efforts of the security community in responsibly disclosing vulnerabilities.

> **Repository**: [https://github.com/jennofrie/CareAxis](https://github.com/jennofrie/CareAxis)

---

## Supported Versions

The following versions of CareAxis are currently receiving security updates:

| Version | Status |
|---------|--------|
| v2.1.0 (current) | Supported — active security patches |
| < v2.1.0 | Not supported — please upgrade |

Only the current production release receives security patches. If you are running an older version, we strongly recommend upgrading to v2.1.0 or later.

---

## Reporting a Vulnerability

**Do not open a public GitHub Issue to report a security vulnerability.**

Public disclosure before a fix is available puts CareAxis users and their NDIS participant data at risk. We ask that you follow responsible disclosure practices as described below.

### How to Report

Send a detailed vulnerability report to:

> **security@jddigitalsystems.com.au**

Please include the following in your report:

1. **Description** — A clear explanation of the vulnerability, including the affected component or endpoint
2. **Steps to reproduce** — A step-by-step walkthrough that allows us to reliably reproduce the issue
3. **Potential impact** — Your assessment of what an attacker could achieve by exploiting this vulnerability (e.g., data exposure, privilege escalation, authentication bypass)
4. **Suggested fix** — If you have a proposed remediation or mitigation, please include it

### Response Time

- You will receive an acknowledgement within **48 hours** of your report
- We will provide a status update within **7 business days**, including an estimated timeline for the fix
- Once a fix is deployed, we will notify you and credit you in the release notes (if desired)

We ask that you keep the vulnerability confidential until we have had a reasonable opportunity to address it.

---

## Security Features of CareAxis

CareAxis is built with multiple layers of security to protect provider and participant data.

### Row Level Security (RLS)

All database tables in CareAxis have **Row Level Security (RLS) enabled** via Supabase PostgreSQL policies. Users can only read and write rows that belong to their own account, enforced at the database level — not just the application layer.

Every table enforces policies of the form:

```sql
USING (auth.uid() = user_id)
```

This means even if application-level access controls were bypassed, the database would still reject unauthorised data access.

### JWT Authentication (Supabase Auth)

All authenticated routes are protected by **JSON Web Tokens (JWT)** issued by Supabase Auth. Tokens are verified server-side on every request. Unauthenticated requests to protected API routes and edge functions are rejected.

Session tokens are short-lived and automatically refreshed by the Supabase client library.

### Domain Restriction Middleware

CareAxis enforces **email domain restrictions** at the middleware level. Only users with verified email addresses from the approved domain (`@cdssvic.com.au`) are permitted to access the application. Attempts to authenticate with other email domains are blocked before reaching any application logic.

This restriction is applied in Next.js middleware (`lib/supabase/middleware.ts`) and is enforced on every request to protected routes.

### Secrets Management

All sensitive credentials used by CareAxis edge functions are stored exclusively in the **Supabase secrets manager** and accessed at runtime via `Deno.env.get()`. No secrets are hardcoded in source code or committed to version control.

The following secrets are stored in Supabase and are never exposed client-side:

- `GEMINI_API_KEY` — AI service authentication
- `STRIPE_SECRET_KEY` — Payment processing
- `STRIPE_WEBHOOK_SECRET` — Webhook signature verification
- `RESEND_API_KEY` — Transactional email
- `SUPABASE_SERVICE_ROLE_KEY` — Privileged database access

### pgvector Embeddings

Document embeddings stored in the `document_embeddings` table use the `pgvector` extension (`extensions.vector(768)`). Access to this table is governed by RLS policies, ensuring that vector search results only return content belonging to the authenticated user's organisation.

### Storage Bucket Access Policies

CareAxis uses two Supabase storage buckets:

- `justification-attachments` — NDIS justification documents
- `careaxis-reports` — Generated PDF reports

Both buckets are configured with **access policies** that restrict read and write operations to authenticated users with matching ownership credentials. Public access is disabled on all buckets.

---

## Known Security Requirements

The following requirements must be maintained by all developers and deployment environments:

### Environment Variables

| Variable | Classification | Rule |
|----------|---------------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Safe for client-side use — no secrets |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Safe for client-side use — governed by RLS |
| `GEMINI_API_KEY` | Secret | Must only exist as a Supabase edge function secret |
| `STRIPE_SECRET_KEY` | Secret | Must only exist as a Supabase edge function secret |
| `STRIPE_WEBHOOK_SECRET` | Secret | Must only exist as a Supabase edge function secret |
| `RESEND_API_KEY` | Secret | Must only exist as a Supabase edge function secret |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Must only exist as a Supabase edge function secret — never expose client-side |

The `NEXT_PUBLIC_` prefix in Next.js causes variables to be bundled into the client-side JavaScript. **Only non-sensitive configuration values** (Supabase URL, anon key) should carry this prefix. Any variable that grants privileged access must never use the `NEXT_PUBLIC_` prefix.

### Service Role Key

The `SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS policies and grants full administrative access to the database. It must:

- Never be included in the `.env` file
- Never be referenced in any Next.js page, component, or API route
- Only be used inside Supabase edge functions, accessed via `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`
- Never be logged, returned in API responses, or included in error messages

### Dependency Security

Keep all dependencies up to date. Run the following regularly to identify known vulnerabilities:

```bash
npm audit
```

Address `high` and `critical` severity advisories promptly. Open a `fix/` branch for dependency patches and follow the normal PR process.

---

## Responsible Disclosure Policy

JD Digital Systems is committed to working with security researchers in good faith. We ask that you:

1. **Report privately** — Use the email address above, not public channels
2. **Give us time to respond** — Allow at least 48 hours for acknowledgement and 7 business days for an initial assessment
3. **Avoid data access** — Do not access, modify, or exfiltrate user data during testing. Limit testing to your own accounts and environments
4. **Avoid disruption** — Do not perform denial-of-service testing or any action that degrades service availability for other users
5. **Act in good faith** — We will do the same

Researchers who follow this policy will not face legal action related to their security research. We are grateful for responsible disclosure and will acknowledge contributors where appropriate.

---

*Security policy maintained by [JD Digital Systems](https://github.com/jennofrie/CareAxis).*
*Last updated: February 2026*
