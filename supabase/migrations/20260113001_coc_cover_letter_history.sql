-- CoC Cover Letter History Table
-- Stores generated cover letters with document hash for caching (1 hour TTL)
-- Maximum 10 records per user with automatic cleanup

CREATE TABLE IF NOT EXISTS public.coc_cover_letter_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  document_hash TEXT NOT NULL,
  file_name TEXT,
  participant_name TEXT,
  ndis_number TEXT,
  sc_level INTEGER DEFAULT 2,
  cover_letter_data JSONB NOT NULL,
  cache_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour')
);

CREATE INDEX IF NOT EXISTS idx_coc_history_user_id ON public.coc_cover_letter_history(user_id);
CREATE INDEX IF NOT EXISTS idx_coc_history_document_hash ON public.coc_cover_letter_history(document_hash);
CREATE INDEX IF NOT EXISTS idx_coc_history_created_at ON public.coc_cover_letter_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coc_history_cache_expires ON public.coc_cover_letter_history(cache_expires_at);

ALTER TABLE public.coc_cover_letter_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='coc_cover_letter_history' AND policyname='Users can view their own CoC history') THEN
    CREATE POLICY "Users can view their own CoC history" ON public.coc_cover_letter_history FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='coc_cover_letter_history' AND policyname='Users can insert their own CoC history') THEN
    CREATE POLICY "Users can insert their own CoC history" ON public.coc_cover_letter_history FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='coc_cover_letter_history' AND policyname='Users can delete their own CoC history') THEN
    CREATE POLICY "Users can delete their own CoC history" ON public.coc_cover_letter_history FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.enforce_coc_history_limit()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.coc_cover_letter_history
  WHERE id IN (
    SELECT id FROM public.coc_cover_letter_history
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    OFFSET 10
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_enforce_coc_history_limit ON public.coc_cover_letter_history;
CREATE TRIGGER trigger_enforce_coc_history_limit
  AFTER INSERT ON public.coc_cover_letter_history
  FOR EACH ROW EXECUTE FUNCTION public.enforce_coc_history_limit();

GRANT SELECT, INSERT, DELETE ON public.coc_cover_letter_history TO authenticated;
