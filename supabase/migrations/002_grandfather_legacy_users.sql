-- Grandfathering Script: Grant legacy_premium tier to all users created before today
-- This ensures existing users retain FULL access forever

-- Update all profiles created before today to 'legacy_premium'
UPDATE public.profiles
SET subscription_tier = 'legacy_premium',
    updated_at = NOW()
WHERE created_at < CURRENT_DATE
  AND subscription_tier != 'legacy_premium';

-- Also handle case where profile might not exist yet for old auth.users
-- Create profiles for any auth.users that don't have a profile yet
INSERT INTO public.profiles (id, subscription_tier, created_at)
SELECT
  au.id,
  CASE
    WHEN au.created_at < CURRENT_DATE THEN 'legacy_premium'
    ELSE 'lite'
  END,
  COALESCE(au.created_at, NOW())
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Log the results
DO $$
DECLARE
  legacy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO legacy_count
  FROM public.profiles
  WHERE subscription_tier = 'legacy_premium';

  RAISE NOTICE 'Grandfathered % users with legacy_premium tier', legacy_count;
END $$;


