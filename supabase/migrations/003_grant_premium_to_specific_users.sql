-- Grant legacy_premium tier to specific users by email
-- This script creates the profiles table if needed, then updates the specified users

-- Step 1: Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  subscription_tier TEXT DEFAULT 'lite' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Step 2: Enable Row Level Security if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create policies if they don't exist (using IF NOT EXISTS equivalent)
DO $$
BEGIN
  -- Drop existing policy if it exists, then create new one
  DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
  CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

  DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
  CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id);

  -- Allow inserts for new profiles
  DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
  CREATE POLICY "Users can insert own profile"
    ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);
END $$;

-- Step 4: Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON public.profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at);

-- Step 5: Update existing profiles for the specified users
UPDATE public.profiles
SET subscription_tier = 'legacy_premium',
    updated_at = NOW()
WHERE id IN (
  SELECT id
  FROM auth.users
  WHERE email IN ('daguiljennofrie@gmail.com', 'angela08moss@gmail.com')
)
AND subscription_tier != 'legacy_premium';

-- Step 6: Create profiles for these users if they don't exist yet
INSERT INTO public.profiles (id, subscription_tier, created_at, updated_at)
SELECT
  au.id,
  'legacy_premium',
  COALESCE(au.created_at, NOW()),
  NOW()
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email IN ('daguiljennofrie@gmail.com', 'angela08moss@gmail.com')
  AND p.id IS NULL
ON CONFLICT (id) DO UPDATE
SET subscription_tier = 'legacy_premium',
    updated_at = NOW();

-- Step 7: Verify the changes
SELECT
  au.email,
  au.created_at as user_created_at,
  p.subscription_tier,
  p.created_at as profile_created_at,
  p.updated_at as profile_updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email IN ('daguiljennofrie@gmail.com', 'angela08moss@gmail.com');
