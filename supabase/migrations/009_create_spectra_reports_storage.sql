-- Migration: Create storage bucket and RLS policies for careaxis-reports (RAG Agent)
-- This migration creates the 'careaxis-reports' bucket for storing PDF reports
-- used by the RAG Agent feature.

-- Step 1: Create the storage bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'careaxis-reports',
  'careaxis-reports',
  false, -- Private bucket
  52428800, -- 50MB file size limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload to careaxis-reports" ON storage.objects;
DROP POLICY IF EXISTS "Users can read from careaxis-reports" ON storage.objects;
DROP POLICY IF EXISTS "Users can update careaxis-reports" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete from careaxis-reports" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access to careaxis-reports" ON storage.objects;

-- Step 3: Create RLS policies for file uploads (INSERT)
-- Users can only upload files to their own directory (reports/{user_id}/)
CREATE POLICY "Users can upload to careaxis-reports"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'careaxis-reports'
  AND (storage.foldername(name))[1] = 'reports'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Step 4: Create RLS policies for file access (SELECT)
-- All authenticated users can read all files (for RAG Agent super admin access)
-- The super admin check is done at the application/edge function level
CREATE POLICY "Users can read from careaxis-reports"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'careaxis-reports');

-- Step 5: Create RLS policies for file updates (UPDATE)
-- Users can only update files in their own directory
CREATE POLICY "Users can update careaxis-reports"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'careaxis-reports'
  AND (storage.foldername(name))[1] = 'reports'
  AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'careaxis-reports'
  AND (storage.foldername(name))[1] = 'reports'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Step 6: Create RLS policies for file deletion (DELETE)
-- Users can only delete files in their own directory
CREATE POLICY "Users can delete from careaxis-reports"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'careaxis-reports'
  AND (storage.foldername(name))[1] = 'reports'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Step 7: Service role has full access (for edge functions)
-- This allows the rag-agent edge function to list all files
CREATE POLICY "Service role full access to careaxis-reports"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'careaxis-reports')
WITH CHECK (bucket_id = 'careaxis-reports');
