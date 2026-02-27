-- Create budgets table for Budget Forecaster feature (Premium only)
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  total_budget DECIMAL(12, 2) NOT NULL CHECK (total_budget >= 0),
  spent_amount DECIMAL(12, 2) DEFAULT 0 NOT NULL CHECK (spent_amount >= 0),
  plan_start_date DATE NOT NULL,
  plan_end_date DATE NOT NULL,
  plan_duration_days INTEGER GENERATED ALWAYS AS (plan_end_date - plan_start_date) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT valid_date_range CHECK (plan_end_date > plan_start_date),
  CONSTRAINT valid_spent CHECK (spent_amount <= total_budget)
);

-- Enable Row Level Security
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can read their own budgets
CREATE POLICY "Users can view own budgets"
  ON public.budgets
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own budgets
CREATE POLICY "Users can insert own budgets"
  ON public.budgets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own budgets
CREATE POLICY "Users can update own budgets"
  ON public.budgets
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy: Users can delete their own budgets
CREATE POLICY "Users can delete own budgets"
  ON public.budgets
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_plan_end_date ON public.budgets(plan_end_date);
CREATE INDEX IF NOT EXISTS idx_budgets_user_plan_dates ON public.budgets(user_id, plan_start_date, plan_end_date);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_budgets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budgets_updated_at();


