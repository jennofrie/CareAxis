-- Performance Optimization Indexes
-- Created: January 3, 2026
-- Purpose: Add missing indexes for common query patterns
-- Reference: MarkDown/PERFORMANCE_OPTIMIZATION_CHANGELOG.md

-- ============================================================================
-- ACTIVITY LOGS INDEX
-- ============================================================================
-- Query pattern: SELECT * FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC
-- Used by: Weekly Summary, Activity Dashboard, Case Notes history
-- Impact: Reduces query time from ~100-500ms to ~10-50ms on large tables

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created
  ON activity_logs(user_id, created_at DESC);

-- ============================================================================
-- RAG AGENT CONVERSATIONS INDEX
-- ============================================================================
-- Query pattern: SELECT * FROM rag_agent_conversations
--                WHERE user_id = ? AND session_id = ? ORDER BY created_at
-- Used by: RAG Agent chat history retrieval
-- Impact: Faster session loading, especially with many conversations

CREATE INDEX IF NOT EXISTS idx_rag_conversations_composite
  ON rag_agent_conversations(user_id, session_id, created_at);

-- ============================================================================
-- BUDGET SNAPSHOTS INDEX
-- ============================================================================
-- Query pattern: SELECT * FROM budget_snapshots WHERE user_id = ? ORDER BY created_at DESC
-- Used by: Budget history, snapshot retrieval
-- Impact: Faster history loading for users with many snapshots

CREATE INDEX IF NOT EXISTS idx_budget_snapshots_user_created
  ON budget_snapshots(user_id, created_at DESC);

-- ============================================================================
-- REPORT AUDITS INDEX
-- ============================================================================
-- Query pattern: SELECT * FROM report_audits WHERE user_id = ? ORDER BY created_at DESC
-- Used by: Senior Planner audit history
-- Impact: Faster audit history retrieval

CREATE INDEX IF NOT EXISTS idx_report_audits_user_created
  ON report_audits(user_id, created_at DESC);

-- ============================================================================
-- PLAN MANAGEMENT QUERIES INDEX
-- ============================================================================
-- Query pattern: SELECT * FROM plan_management_queries WHERE user_id = ? ORDER BY created_at DESC
-- Used by: Plan Management Expert history
-- Impact: Faster query history retrieval

CREATE INDEX IF NOT EXISTS idx_plan_queries_user_created
  ON plan_management_queries(user_id, created_at DESC);

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- If these indexes cause issues, run the following to remove them:
--
-- DROP INDEX IF EXISTS idx_activity_logs_user_created;
-- DROP INDEX IF EXISTS idx_rag_conversations_composite;
-- DROP INDEX IF EXISTS idx_budget_snapshots_user_created;
-- DROP INDEX IF EXISTS idx_report_audits_user_created;
-- DROP INDEX IF EXISTS idx_plan_queries_user_created;
--
-- ============================================================================
