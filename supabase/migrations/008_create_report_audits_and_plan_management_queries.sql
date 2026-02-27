-- Create tables required for Senior Planner + Plan Management Expert history
-- Adds RLS policies for multi-tenant isolation (auth.uid() = user_id)

-- ============================================================================
-- report_audits: stores Senior Planner audit history
-- ============================================================================

create table if not exists public.report_audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  document_type text not null,
  document_name text not null,
  document_content text,

  overall_score integer not null,
  compliance_score integer,
  nexus_score integer,
  vfm_score integer,
  evidence_score integer,
  significant_change_score integer,

  status text not null,
  planner_summary text,

  strengths jsonb,
  improvements jsonb,
  red_flags jsonb,
  language_fixes jsonb,
  planner_questions jsonb,

  created_at timestamptz not null default now()
);

create index if not exists idx_report_audits_user_created_at
  on public.report_audits(user_id, created_at desc);

alter table public.report_audits enable row level security;

drop policy if exists "Users can view own report audits" on public.report_audits;
create policy "Users can view own report audits"
  on public.report_audits for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own report audits" on public.report_audits;
create policy "Users can insert own report audits"
  on public.report_audits for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own report audits" on public.report_audits;
create policy "Users can update own report audits"
  on public.report_audits for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own report audits" on public.report_audits;
create policy "Users can delete own report audits"
  on public.report_audits for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- plan_management_queries: stores Plan Management Expert query history
-- ============================================================================

create table if not exists public.plan_management_queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  query_type text,
  query_text text,

  document_name text,
  document_type text,

  model_used text,
  response_summary text,
  response_details jsonb,

  topics_covered text[],
  price_guide_references text[],

  created_at timestamptz not null default now()
);

create index if not exists idx_plan_management_queries_user_created_at
  on public.plan_management_queries(user_id, created_at desc);

alter table public.plan_management_queries enable row level security;

drop policy if exists "Users can view own plan management queries" on public.plan_management_queries;
create policy "Users can view own plan management queries"
  on public.plan_management_queries for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own plan management queries" on public.plan_management_queries;
create policy "Users can insert own plan management queries"
  on public.plan_management_queries for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own plan management queries" on public.plan_management_queries;
create policy "Users can update own plan management queries"
  on public.plan_management_queries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own plan management queries" on public.plan_management_queries;
create policy "Users can delete own plan management queries"
  on public.plan_management_queries for delete
  using (auth.uid() = user_id);



