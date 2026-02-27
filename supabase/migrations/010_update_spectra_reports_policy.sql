-- Migration: Update storage policy to allow flat structure in reports/
-- This removes the user subfolder requirement for n8n compatibility

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can upload to careaxis-reports" ON storage.objects;

-- Create new policy allowing uploads directly to reports/
CREATE POLICY "Users can upload to careaxis-reports"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'careaxis-reports'
  AND (storage.foldername(name))[1] = 'reports'
);
