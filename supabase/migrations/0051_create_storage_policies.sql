-- Migration: Create storage bucket and RLS policies for justification attachments
-- This migration creates the 'justification-attachments' bucket and sets up
-- Row Level Security policies to ensure users can only access their own files.

-- Step 1: Create the storage bucket (if it doesn't exist)
-- Note: Bucket creation via SQL requires the storage extension
-- If this fails, create the bucket manually in Supabase Dashboard > Storage

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'justification-attachments',
  'justification-attachments',
  false, -- Private bucket (users can only access their own files)
  52428800, -- 50MB file size limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Create RLS policies for file uploads (INSERT)
-- Users can only upload files to their own directory
CREATE POLICY "Users can upload own attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'justification-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Step 3: Create RLS policies for file access (SELECT)
-- Users can only view files in their own directory
CREATE POLICY "Users can view own attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'justification-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Step 4: Create RLS policies for file updates (UPDATE)
-- Users can only update files in their own directory
CREATE POLICY "Users can update own attachments"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'justification-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'justification-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Step 5: Create RLS policies for file deletion (DELETE)
-- Users can only delete files in their own directory
CREATE POLICY "Users can delete own attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'justification-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Note: If bucket creation fails, manually create it in Supabase Dashboard:
-- 1. Go to Storage > New Bucket
-- 2. Name: justification-attachments
-- 3. Public: No (private)
-- 4. File size limit: 50MB
-- 5. Allowed MIME types: application/pdf, image/jpeg, image/png, image/jpg


