-- Add Plan Timeline dates to cases table
-- Enables functional progress bar based on NDIS plan dates

-- Add plan date columns
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS plan_start_date DATE,
ADD COLUMN IF NOT EXISTS plan_end_date DATE;

-- Create index for efficient date queries
CREATE INDEX IF NOT EXISTS idx_cases_plan_dates ON cases(plan_start_date, plan_end_date);

-- Add comment for documentation
COMMENT ON COLUMN cases.plan_start_date IS 'NDIS plan start date - used for timeline progress calculation';
COMMENT ON COLUMN cases.plan_end_date IS 'NDIS plan end date - used for timeline progress calculation and expiry alerts';
