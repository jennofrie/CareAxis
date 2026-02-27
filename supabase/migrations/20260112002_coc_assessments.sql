-- Migration: Create CoC (Change of Circumstances) Assessments Table
-- Date: 2026-01-12

CREATE TABLE IF NOT EXISTS public.coc_assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    circumstances_description TEXT NOT NULL,
    trigger_categories JSONB DEFAULT '[]'::jsonb,
    document_names TEXT[] DEFAULT '{}',
    confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
    eligibility_verdict TEXT NOT NULL CHECK (eligibility_verdict IN ('likely_eligible', 'possibly_eligible', 'not_eligible', 'security_blocked')),
    recommended_pathway TEXT NOT NULL,
    sc_report TEXT NOT NULL,
    participant_report TEXT NOT NULL,
    evidence_suggestions JSONB DEFAULT '[]'::jsonb,
    ndis_references JSONB DEFAULT '[]'::jsonb,
    next_steps JSONB DEFAULT '[]'::jsonb,
    assessment_version TEXT DEFAULT '1.0'
);

CREATE INDEX IF NOT EXISTS idx_coc_assessments_user_id ON public.coc_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_coc_assessments_created_at ON public.coc_assessments(created_at DESC);

ALTER TABLE public.coc_assessments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='coc_assessments' AND policyname='Users can view own coc assessments') THEN
    CREATE POLICY "Users can view own coc assessments" ON public.coc_assessments FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='coc_assessments' AND policyname='Users can insert own coc assessments') THEN
    CREATE POLICY "Users can insert own coc assessments" ON public.coc_assessments FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='coc_assessments' AND policyname='Users can delete own coc assessments') THEN
    CREATE POLICY "Users can delete own coc assessments" ON public.coc_assessments FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.cleanup_old_coc_assessments()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.coc_assessments
    WHERE user_id = NEW.user_id
    AND id NOT IN (
        SELECT id FROM public.coc_assessments
        WHERE user_id = NEW.user_id
        ORDER BY created_at DESC
        LIMIT 10
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_cleanup_coc_assessments ON public.coc_assessments;
CREATE TRIGGER trigger_cleanup_coc_assessments
    AFTER INSERT ON public.coc_assessments
    FOR EACH ROW EXECUTE FUNCTION public.cleanup_old_coc_assessments();

GRANT SELECT, INSERT, DELETE ON public.coc_assessments TO authenticated;
