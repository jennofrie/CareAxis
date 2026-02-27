-- Add category columns for NDIS budget breakdown (Core, Capacity Building, Capital)
-- Migration: 005_add_budget_categories.sql

-- Add category columns (nullable first for safe migration)
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS core_budget DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS core_spent DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS capacity_budget DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS capacity_spent DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS capital_budget DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS capital_spent DECIMAL(12,2) DEFAULT 0;

-- Migrate existing data to Core category (preserve existing budgets)
UPDATE public.budgets SET
  core_budget = total_budget,
  core_spent = spent_amount
WHERE core_budget = 0 AND total_budget > 0;

-- Update constraints - drop old and category constraints if they exist, then re-add
ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS valid_spent;
ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS valid_core_spent;
ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS valid_capacity_spent;
ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS valid_capital_spent;

-- Add category-specific constraints
ALTER TABLE public.budgets
  ADD CONSTRAINT valid_core_spent CHECK (core_spent >= 0 AND core_spent <= core_budget),
  ADD CONSTRAINT valid_capacity_spent CHECK (capacity_spent >= 0 AND capacity_spent <= capacity_budget),
  ADD CONSTRAINT valid_capital_spent CHECK (capital_spent >= 0 AND capital_spent <= capital_budget);

-- Make columns NOT NULL after migration
ALTER TABLE public.budgets
  ALTER COLUMN core_budget SET NOT NULL,
  ALTER COLUMN core_spent SET NOT NULL,
  ALTER COLUMN capacity_budget SET NOT NULL,
  ALTER COLUMN capacity_spent SET NOT NULL,
  ALTER COLUMN capital_budget SET NOT NULL,
  ALTER COLUMN capital_spent SET NOT NULL;


