-- Create activity_logs table
-- Must run BEFORE 20260103_performance_indexes.sql which creates an index on this table
-- Used by: Dashboard, VisualCaseNotes, ReportSynthesizer, CoCCoverLetterGenerator

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own activity
CREATE POLICY "Users can view own activity logs"
  ON public.activity_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own activity
CREATE POLICY "Users can insert own activity logs"
  ON public.activity_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role has full access (for edge functions logging on behalf of users)
CREATE POLICY "Service role full access to activity logs"
  ON public.activity_logs
  FOR ALL
  USING (auth.role() = 'service_role');
