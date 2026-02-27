-- Create budget_snapshots table for Budget Forecaster history tracking
-- This table stores snapshots of budget forecasts with timestamps for audit and reporting purposes
CREATE TABLE IF NOT EXISTS public.budget_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE NOT NULL,

  -- Snapshot metadata
  snapshot_name VARCHAR(255), -- Optional name for the snapshot
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Budget data at time of snapshot (full copy for historical accuracy)
  total_budget DECIMAL(12, 2) NOT NULL,
  spent_amount DECIMAL(12, 2) NOT NULL,
  plan_start_date DATE NOT NULL,
  plan_end_date DATE NOT NULL,
  plan_duration_days INTEGER NOT NULL,

  -- Category budgets
  core_budget DECIMAL(12, 2) NOT NULL DEFAULT 0,
  core_spent DECIMAL(12, 2) NOT NULL DEFAULT 0,
  capacity_budget DECIMAL(12, 2) NOT NULL DEFAULT 0,
  capacity_spent DECIMAL(12, 2) NOT NULL DEFAULT 0,
  capital_budget DECIMAL(12, 2) NOT NULL DEFAULT 0,
  capital_spent DECIMAL(12, 2) NOT NULL DEFAULT 0,

  -- Forecast data at time of snapshot (stored as JSONB for flexibility)
  forecast_data JSONB NOT NULL,

  -- Export metadata (for PDF generation)
  participant_name VARCHAR(255),
  ndis_number VARCHAR(50),

  CONSTRAINT valid_snapshot_spent CHECK (spent_amount >= 0 AND spent_amount <= total_budget),
  CONSTRAINT valid_snapshot_dates CHECK (plan_end_date > plan_start_date)
);

-- Enable Row Level Security
ALTER TABLE public.budget_snapshots ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can read their own budget snapshots
CREATE POLICY "Users can view own budget snapshots"
  ON public.budget_snapshots
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own budget snapshots
CREATE POLICY "Users can insert own budget snapshots"
  ON public.budget_snapshots
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can delete their own budget snapshots
CREATE POLICY "Users can delete own budget snapshots"
  ON public.budget_snapshots
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_budget_snapshots_user_id ON public.budget_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_snapshots_budget_id ON public.budget_snapshots(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_snapshots_created_at ON public.budget_snapshots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_budget_snapshots_user_created ON public.budget_snapshots(user_id, created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE public.budget_snapshots IS 'Stores historical snapshots of budget forecasts for audit trail and reporting purposes';


