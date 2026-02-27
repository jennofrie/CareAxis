-- Migration: Create Synthesized Reports Table for Report Synthesizer History
-- Date: 2026-01-12
-- Feature: Report Synthesizer History Tracking with auto-cleanup

-- Create the synthesized_reports table
CREATE TABLE IF NOT EXISTS public.synthesized_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Input data
    persona_id TEXT NOT NULL,
    persona_title TEXT NOT NULL,
    document_names TEXT[] DEFAULT '{}',
    document_count INTEGER NOT NULL DEFAULT 0,
    agent_mode BOOLEAN DEFAULT FALSE,

    -- Synthesized content (by section)
    participant_summary TEXT,
    clinical_findings TEXT,
    ndis_goals TEXT,
    evidence_barriers TEXT,
    participant_feedback TEXT,
    recommendations_core TEXT,
    recommendations_capacity TEXT,
    recommendations_capital TEXT,

    -- Full report text (for display and PDF export)
    full_report TEXT NOT NULL,

    -- Metadata
    model_used TEXT DEFAULT 'gemini-2.0-flash',
    synthesis_version TEXT DEFAULT '1.0'
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_synthesized_reports_user_id ON public.synthesized_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_synthesized_reports_created_at ON public.synthesized_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_synthesized_reports_persona ON public.synthesized_reports(persona_id);

-- Enable Row Level Security
ALTER TABLE public.synthesized_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own reports
CREATE POLICY "Users can view own synthesized reports"
    ON public.synthesized_reports
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own synthesized reports"
    ON public.synthesized_reports
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own synthesized reports"
    ON public.synthesized_reports
    FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own synthesized reports"
    ON public.synthesized_reports
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Function to auto-delete old reports (keep only 10 most recent per user)
CREATE OR REPLACE FUNCTION public.cleanup_old_synthesized_reports()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete reports beyond the 10 most recent for this user
    DELETE FROM public.synthesized_reports
    WHERE user_id = NEW.user_id
    AND id NOT IN (
        SELECT id FROM public.synthesized_reports
        WHERE user_id = NEW.user_id
        ORDER BY created_at DESC
        LIMIT 10
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run cleanup after each insert
DROP TRIGGER IF EXISTS trigger_cleanup_synthesized_reports ON public.synthesized_reports;
CREATE TRIGGER trigger_cleanup_synthesized_reports
    AFTER INSERT ON public.synthesized_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.cleanup_old_synthesized_reports();

-- Grant necessary permissions
GRANT SELECT, INSERT, DELETE, UPDATE ON public.synthesized_reports TO authenticated;

COMMENT ON TABLE public.synthesized_reports IS 'Stores synthesized NDIS reports from Report Synthesizer with history tracking';
COMMENT ON COLUMN public.synthesized_reports.persona_id IS 'The professional perspective used (sc-level-2, ssc-level-3, prc, ot)';
COMMENT ON COLUMN public.synthesized_reports.full_report IS 'Complete synthesized report text for display and PDF export';
COMMENT ON COLUMN public.synthesized_reports.agent_mode IS 'Whether CareAxis AI Pro (agent mode) was used for synthesis';
