-- Create cases table (or patch if already exists from manual setup)
-- Must run BEFORE 20260113_add_plan_dates_to_cases.sql

CREATE TABLE IF NOT EXISTS public.cases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  participant_name TEXT NOT NULL,
  ndis_number TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Active',
  progress INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Safely add any columns that may be missing if table was created manually
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS participant_name TEXT NOT NULL DEFAULT '';
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS ndis_number TEXT NOT NULL DEFAULT '';
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Active';
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS progress INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Enable Row Level Security
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

-- Create RLS policies only if they don't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cases' AND policyname = 'Users can view own cases'
  ) THEN
    CREATE POLICY "Users can view own cases" ON public.cases FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cases' AND policyname = 'Users can insert own cases'
  ) THEN
    CREATE POLICY "Users can insert own cases" ON public.cases FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cases' AND policyname = 'Users can update own cases'
  ) THEN
    CREATE POLICY "Users can update own cases" ON public.cases FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cases' AND policyname = 'Users can delete own cases'
  ) THEN
    CREATE POLICY "Users can delete own cases" ON public.cases FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.update_cases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_cases_updated_at ON public.cases;
CREATE TRIGGER update_cases_updated_at
  BEFORE UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.update_cases_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cases_user_id ON public.cases(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_user_created ON public.cases(user_id, created_at DESC);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cases' AND column_name = 'status'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_cases_status ON public.cases(user_id, status)';
  END IF;
END $$;
