-- Alter budget_snapshots table to preserve snapshots when budget is deleted
-- This allows historical budget forecasts to remain even after the original budget is deleted

-- First, drop the existing foreign key constraint
ALTER TABLE public.budget_snapshots
  DROP CONSTRAINT IF EXISTS budget_snapshots_budget_id_fkey;

-- Make budget_id nullable (since snapshots should persist even after budget deletion)
ALTER TABLE public.budget_snapshots
  ALTER COLUMN budget_id DROP NOT NULL;

-- Re-add the foreign key constraint with ON DELETE SET NULL instead of CASCADE
-- This means when a budget is deleted, the snapshot remains but budget_id becomes NULL
ALTER TABLE public.budget_snapshots
  ADD CONSTRAINT budget_snapshots_budget_id_fkey
  FOREIGN KEY (budget_id)
  REFERENCES public.budgets(id)
  ON DELETE SET NULL;

-- Update the comment to reflect this behavior
COMMENT ON COLUMN public.budget_snapshots.budget_id IS 'Reference to the original budget. Set to NULL if the budget is deleted, but snapshot data is preserved for historical records.';


