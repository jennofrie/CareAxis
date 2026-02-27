# Contributing to CareAxis

Welcome, and thank you for your interest in contributing to **CareAxis** — an NDIS B2B SaaS toolkit built and maintained by **JD Digital Systems**.

CareAxis is purpose-built to support NDIS service providers with AI-assisted planning, budget management, and reporting tools. We welcome contributions that improve the platform's reliability, accessibility, and value for providers and their participants.

> **Repository**: [https://github.com/jennofrie/CareAxis](https://github.com/jennofrie/CareAxis)

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

All contributors are expected to engage respectfully and professionally. We are committed to maintaining an inclusive and welcoming environment.

**In short:**
- Be respectful and constructive in all communications
- Critique ideas, not people
- Keep discussions relevant to the project
- Harassment, discrimination, or abusive behaviour of any kind will not be tolerated

Contributors who violate these expectations may be removed from the project at the discretion of JD Digital Systems.

---

## Reporting Bugs

If you encounter a bug, please open a **GitHub Issue** at:

> [https://github.com/jennofrie/CareAxis/issues](https://github.com/jennofrie/CareAxis/issues)

When filing a bug report, please include:

- A clear and concise description of the problem
- Steps to reproduce the issue
- Expected behaviour vs. actual behaviour
- Screenshots or error logs if applicable
- Your environment (OS, Node.js version, browser)

> **Security vulnerabilities must not be reported via public Issues.** See [SECURITY.md](./SECURITY.md) for the responsible disclosure process.

---

## Suggesting Features

Feature suggestions are welcome via:

- **GitHub Discussions** (preferred for open-ended ideas): [https://github.com/jennofrie/CareAxis/discussions](https://github.com/jennofrie/CareAxis/discussions)
- **GitHub Issues** (for well-defined, actionable requests): [https://github.com/jennofrie/CareAxis/issues](https://github.com/jennofrie/CareAxis/issues)

When suggesting a feature, please describe:

- The problem it solves or the value it adds
- The expected behaviour
- Any relevant NDIS context (support categories, plan types, etc.) if applicable

---

## Development Setup

### Prerequisites

Ensure you have the following installed before getting started:

| Tool | Version |
|------|---------|
| Node.js | 20 or higher |
| npm | Bundled with Node.js 20+ |
| Supabase CLI | v2.75.0 or higher |
| Git | Latest stable |

Install the Supabase CLI if needed:

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

Copy the example environment file and populate the required values:

```bash
cp .env.example .env
```

Open `.env` and fill in your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` values. These are safe to include client-side. Do not add any secret keys to this file.

**4. Link to your Supabase project**

```bash
supabase link --project-ref <your-project-ref>
```

**5. Apply database migrations**

```bash
supabase db push
```

This will apply all migrations in `supabase/migrations/` to your linked remote project.

**6. Start the development server**

```bash
npm run dev
```

The application runs on **port 3001** by default.

```
http://localhost:3001
```

---

## Branch Naming Conventions

Use the following prefixes when naming branches:

| Prefix | Purpose |
|--------|---------|
| `feature/` | New features or enhancements |
| `fix/` | Bug fixes |
| `chore/` | Maintenance, dependency updates, configuration changes |
| `docs/` | Documentation changes only |

**Examples:**

```
feature/budget-forecaster-export
fix/coc-cover-letter-history-pagination
chore/update-supabase-cli
docs/update-contributing-guide
```

Branch names should be lowercase and hyphen-separated. Avoid generic names like `fix/bug` or `feature/update`.

---

## Commit Message Format

CareAxis uses **Conventional Commits** for all commit messages. This ensures a consistent, readable history and enables automated changelog generation.

### Format

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `chore` | Build process, tooling, or dependency changes |
| `docs` | Documentation only changes |
| `style` | Formatting, missing semicolons, etc. (no logic change) |
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

- Use the **imperative mood** in the description ("add", not "added" or "adds")
- Keep the description under 72 characters
- Reference related Issues or PRs in the footer: `Closes #42`

---

## Pull Request Process

1. **Fork** the repository and create your branch from `main`
2. Follow the branch naming and commit message conventions above
3. Ensure your changes are covered by tests where applicable
4. Verify the application builds without errors: `npm run build`
5. Open a Pull Request against the `main` branch
6. Fill in the PR template, including:
   - A description of what was changed and why
   - Steps to test the changes locally
   - Screenshots if relevant (especially for UI changes)
   - Reference to any related Issues
7. A maintainer from JD Digital Systems will review your PR
8. Address any requested changes and re-request review
9. Once approved, a maintainer will merge the PR

**Do not merge your own PRs.** All merges to `main` are performed by the JD Digital Systems team.

---

## Code Style

CareAxis enforces a consistent code style across the codebase. Please follow these guidelines when contributing:

### TypeScript

- **Strict mode is enabled** — do not disable TypeScript strict checks
- All functions and components must have explicit return types where inference is insufficient
- Prefer `interface` over `type` for object shapes
- Avoid `any` — use `unknown` or properly typed generics instead
- No unused variables or imports (enforced by the linter)

### Styling

- Use **Tailwind CSS** for all styling — do not write custom CSS unless absolutely necessary
- Follow the existing utility class patterns in the codebase
- Responsive design is required for all UI changes

### Components

- Use **shadcn/ui** components as the foundation for all UI elements
- Custom components belong in `components/ui/`
- Prefer **Server Components** where possible — only use Client Components (`"use client"`) when interactivity or browser APIs are required
- Keep components focused and composable

### General

- No unused imports
- No `console.log` statements in committed code (use proper error handling)
- File names use kebab-case for pages and PascalCase for components
- Organise imports: external packages first, then internal modules

---

## Testing Requirements

Before submitting a PR, verify the following:

- The application builds cleanly: `npm run build`
- All existing functionality works as expected in the development environment
- New features include manual test steps documented in the PR description
- Edge functions are tested locally before deployment (see below)

Where automated tests are introduced to the project, new contributions should maintain or improve test coverage for the affected modules.

---

## Edge Function Development

CareAxis uses **Supabase Edge Functions** running on the **Deno runtime**. All 16 edge functions live in `supabase/functions/`.

### Key points

- Edge functions run in Deno — use Deno-compatible imports (no `node_modules`)
- Do not use Node.js built-in modules; use Deno standard library equivalents
- All secrets (API keys, service role keys) must be accessed via `Deno.env.get()` — never hardcoded

### Local development

Serve functions locally for testing:

```bash
supabase functions serve <function-name>
```

To serve all functions:

```bash
supabase functions serve
```

Test with a local HTTP client (e.g., curl or a REST client):

```bash
curl -i --location --request POST \
  'http://localhost:54321/functions/v1/<function-name>' \
  --header 'Authorization: Bearer <your-anon-key>' \
  --header 'Content-Type: application/json' \
  --data '{"key":"value"}'
```

### Deploying edge functions

```bash
supabase functions deploy <function-name>
```

### Setting secrets for edge functions

```bash
supabase secrets set MY_SECRET=value
```

List existing secrets (values are not shown):

```bash
supabase secrets list
```

Required secrets for full functionality:

- `GEMINI_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Database Migration Guidelines

All schema changes must be made via SQL migration files. Direct schema edits through the Supabase dashboard are not permitted in production.

### File naming convention

```
YYYYMMDD_description.sql
```

**Examples:**

```
20260301_add_support_category_to_budgets.sql
20260315_create_participant_goals_table.sql
```

Use underscores between words in the description. Keep descriptions concise but meaningful.

### Migration rules

- **Never modify an existing migration file** once it has been pushed to remote
- All new changes must be in a new migration file
- Migrations must be idempotent where possible (use `IF NOT EXISTS`, `IF EXISTS`)
- Always include rollback considerations in the PR description

### pgvector usage

The `pgvector` extension is installed in the `extensions` schema. When referencing vector types in migrations, always use the fully qualified type:

```sql
-- Correct
embeddings extensions.vector(768)

-- Incorrect — do not use
embeddings vector(768)
```

### Row Level Security (RLS)

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

### Environment variable rules

| Variable prefix | Where it lives | Safe to expose? |
|----------------|---------------|-----------------|
| `NEXT_PUBLIC_*` | `.env` file | Yes — client-safe only |
| Edge function secrets | Supabase secrets manager | No — server only |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secrets only | No — never client-side |

### .env.example

The `.env.example` file serves as a template for required environment variables. When adding new `NEXT_PUBLIC_*` variables, add a placeholder entry to `.env.example` with a descriptive comment:

```bash
# Supabase project URL (from Supabase dashboard > Project Settings > API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
```

The actual `.env` file is excluded from version control via `.gitignore`. **Do not remove it from `.gitignore`.**

---

## License

By contributing to CareAxis, you agree that your contributions will be licensed under the same license as the project.

CareAxis is proprietary software maintained by **JD Digital Systems**. Please review the project license before contributing.

---

*Maintained by [JD Digital Systems](https://github.com/jennofrie/CareAxis) — building technology for NDIS providers.*
