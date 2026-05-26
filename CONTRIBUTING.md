# Contributing to CareAxis

Thank you for your interest in contributing to **CareAxis** — an NDIS B2B SaaS platform built and maintained by **JD Digital Systems**.

CareAxis is purpose-built to support NDIS service providers with AI-assisted planning, budget management, and reporting workflows. We welcome contributions that improve the platform's reliability, accessibility, and value for providers and their participants.

> **Repository**: [github.com/jennofrie/CareAxis](https://github.com/jennofrie/CareAxis)

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Development Setup](#development-setup)
- [Branch Naming Conventions](#branch-naming-conventions)
- [Commit Message Format](#commit-message-format)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Testing Requirements](#testing-requirements)
- [Edge Function Development](#edge-function-development)
- [Database Migration Guidelines](#database-migration-guidelines)
- [Secrets and Environment Variables](#secrets-and-environment-variables)
- [License](#license)

---

## Code of Conduct

All contributors are expected to engage respectfully and professionally. JD Digital Systems is committed to maintaining an inclusive and welcoming environment for all participants.

**Expected behaviour:**

- Communicate respectfully and constructively at all times
- Critique ideas, not people
- Keep discussions relevant to the project
- Harassment, discrimination, or abusive behaviour of any kind will not be tolerated

Contributors who violate these expectations may be removed from the project at the discretion of JD Digital Systems.

---

## Reporting Bugs

If you encounter a bug, open a **GitHub Issue**:

> [github.com/jennofrie/CareAxis/issues](https://github.com/jennofrie/CareAxis/issues)

When filing a bug report, please include:

- A clear, concise description of the problem
- Steps to reproduce the issue reliably
- Expected behaviour vs. actual behaviour
- Screenshots or error logs where applicable
- Your environment (OS, Node.js version, browser)

> **Security vulnerabilities must not be reported via public Issues.** See [SECURITY.md](./SECURITY.md) for the responsible disclosure process.

---

## Suggesting Features

Feature suggestions are welcome via:

- **GitHub Discussions** (preferred for open-ended ideas): [github.com/jennofrie/CareAxis/discussions](https://github.com/jennofrie/CareAxis/discussions)
- **GitHub Issues** (for well-defined, actionable requests): [github.com/jennofrie/CareAxis/issues](https://github.com/jennofrie/CareAxis/issues)

When proposing a feature, describe:

- The problem it solves or the value it delivers
- The expected behaviour
- Any relevant NDIS context (support categories, plan types, practice standards) if applicable

---

## Development Setup

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20 or higher |
| npm | Bundled with Node.js 20+ |
| Supabase CLI | v2.75.0 or higher |
| Git | Latest stable |

Install the Supabase CLI:

```bash
npm install -g supabase
```

### Local Setup Steps

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
```

Open `.env` and populate `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. These values are safe for client-side use. Do not add secret keys to this file.

**4. Link to your Supabase project**

```bash
supabase login
supabase link --project-ref <your-project-ref>
```

**5. Apply database migrations**

```bash
supabase db push
```

**6. Start the development server**

```bash
npm run dev
```

The application runs at **http://localhost:3001**.

---

## Branch Naming Conventions

| Prefix | Purpose |
|---|---|
| `feature/` | New features or enhancements |
| `fix/` | Bug fixes |
| `chore/` | Maintenance, dependency updates, configuration |
| `docs/` | Documentation-only changes |

**Examples:**

```
feature/budget-forecaster-export
fix/coc-cover-letter-history-pagination
chore/update-supabase-cli
docs/update-architecture-guide
```

Branch names must be lowercase and hyphen-separated. Avoid generic names like `fix/bug` or `feature/update`.

---

## Commit Message Format

CareAxis uses **Conventional Commits** for all commit messages, ensuring a consistent and readable history.

### Format

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

### Types

| Type | When to Use |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `chore` | Build process, tooling, or dependency changes |
| `docs` | Documentation-only changes |
| `style` | Formatting, whitespace (no logic change) |
| `refactor` | Code restructuring without feature change or bug fix |
| `test` | Adding or updating tests |
| `perf` | Performance improvements |

### Examples

```
feat(budget): add CSV export to budget forecaster
fix(auth): correct callback URL for email confirmation
chore(deps): upgrade supabase-js to v2.49
docs(contributing): add edge function development section
refactor(pdf): extract shared header logic to pdfExport.ts
```

**Rules:**
- Use the **imperative mood** in the description: "add" not "added" or "adds"
- Keep the subject line under 72 characters
- Reference related Issues or PRs in the footer: `Closes #42`

---

## Pull Request Process

1. **Fork** the repository and create your branch from `main`
2. Follow the branch naming and commit message conventions above
3. Ensure your changes are covered by tests where applicable
4. Verify the application builds without errors: `npm run build`
5. Open a Pull Request against the `main` branch
6. Fill in the PR template with:
   - A description of what changed and why
   - Steps to test the changes locally
   - Screenshots for any UI changes
   - References to related Issues
7. A maintainer from JD Digital Systems will review your PR
8. Address any requested changes and re-request review
9. Once approved, a maintainer will merge the PR

**Do not merge your own PRs.** All merges to `main` are performed by the JD Digital Systems team.

---

## Code Style

### TypeScript

- **Strict mode is enabled** — do not disable TypeScript strict checks
- All functions and components should have explicit return types where inference is insufficient
- Prefer `interface` over `type` for object shapes
- Avoid `any` — use `unknown` or properly-typed generics instead
- No unused variables or imports

### Styling

- Use **Tailwind CSS** for all styling — do not write custom CSS unless absolutely necessary
- Follow the existing utility class patterns in the codebase
- Responsive design is required for all UI changes

### Components

- Use **shadcn/ui** components as the foundation for all UI elements
- Custom components belong in `components/ui/`
- Prefer **React Server Components** where possible — only use Client Components (`"use client"`) when interactivity or browser APIs are required
- Keep components focused and composable

### General

- No `console.log` statements in committed code — use proper error handling
- File names: kebab-case for pages, PascalCase for components
- Import order: external packages first, then internal modules

---

## Testing Requirements

Before submitting a PR, confirm:

- The application builds cleanly: `npm run build`
- All existing functionality works as expected in the development environment
- New features include manual test steps documented in the PR description
- Edge functions have been tested locally before deployment

---

## Edge Function Development

CareAxis uses **Supabase Edge Functions** on the **Deno runtime**. All functions live in `supabase/functions/`.

### Key Rules

- Edge functions run in Deno — use Deno-compatible imports (no `node_modules`)
- Do not use Node.js built-in modules; use Deno standard library equivalents
- All secrets must be accessed via `Deno.env.get()` — never hardcoded

### Local Development

Serve all functions locally:

```bash
supabase functions serve --env-file .env
```

Test with curl:

```bash
# Public function (no auth required)
curl -X POST http://localhost:54321/functions/v1/synthesize-report \
  -H "Content-Type: application/json" \
  -d '{"sources": [], "reportTitle": "Test"}'

# Authenticated function
curl -X POST http://localhost:54321/functions/v1/analyze-roster \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_access_token>" \
  -d '{"rosterData": [], "includePenaltyRates": true}'
```

### Deploying

```bash
supabase functions deploy <function-name>
```

### Managing Secrets

```bash
supabase secrets set MY_SECRET=value
supabase secrets list   # values are not shown
```

Required secrets for full functionality:

- `GEMINI_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Database Migration Guidelines

All schema changes must be made via SQL migration files. Direct schema edits via the Supabase Dashboard are not permitted in production.

### File Naming Convention

```
YYYYMMDD_description.sql
```

**Examples:**

```
20260301_add_support_category_to_budgets.sql
20260315_create_participant_goals_table.sql
```

### Migration Rules

- **Never modify an existing migration file** once pushed to remote
- All new schema changes must be in a new, uniquely-named migration file
- Write migrations to be idempotent where possible (`IF NOT EXISTS`, `IF EXISTS`)
- Include rollback considerations in the PR description

### pgvector Convention

Always use the fully qualified vector type in migrations:

```sql
-- Correct
embeddings extensions.vector(768)

-- Incorrect — do not use
embeddings vector(768)
```

### Row Level Security

All new tables must have RLS enabled with appropriate policies:

```sql
ALTER TABLE your_new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own rows"
  ON your_new_table
  FOR ALL
  USING (auth.uid() = user_id);
```

---

## Secrets and Environment Variables

**Never commit API keys, tokens, or secrets to the repository.**

| Variable Prefix | Location | Client-Safe? |
|---|---|---|
| `NEXT_PUBLIC_*` | `.env` file | Yes — non-sensitive config only |
| Edge function secrets | Supabase secrets manager | No — server-only |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secrets manager | No — never client-side |

### Updating `.env.example`

When adding new `NEXT_PUBLIC_*` variables, add a placeholder to `.env.example` with a descriptive comment:

```bash
# Supabase project URL (from Supabase Dashboard > Project Settings > API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
```

The actual `.env` file is excluded from version control via `.gitignore`. Do not remove it from `.gitignore`.

---

## License

By contributing to CareAxis, you agree that your contributions will be licensed under the same terms as the project.

CareAxis is proprietary software maintained by **JD Digital Systems**. Please review the project license before contributing.

---

*Maintained by [JD Digital Systems](https://github.com/jennofrie/CareAxis) — building technology for NDIS service providers.*
