-- =============================================
-- STORAGE POLICIES FOR BUSINESS ASSETS
-- =============================================
-- Creates RLS policies for the business-assets bucket
-- to ensure only authenticated users from the same business
-- can access their assets

-- Policy: Users can upload to their own business folder
CREATE POLICY "business_members_upload_assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-assets'
  AND (storage.foldername(name))[1]::integer = (
    SELECT business_id::text::integer
    FROM public.user_details
    WHERE id = auth.uid()
  )
);

-- Policy: Users can update assets in their business folder
CREATE POLICY "business_members_update_assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'business-assets'
  AND (storage.foldername(name))[1]::integer = (
    SELECT business_id::text::integer
    FROM public.user_details
    WHERE id = auth.uid()
  )
);

-- Policy: Users can delete assets from their business folder
CREATE POLICY "business_members_delete_assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'business-assets'
  AND (storage.foldername(name))[1]::integer = (
    SELECT business_id::text::integer
    FROM public.user_details
    WHERE id = auth.uid()
  )
);

-- Policy: Users can read assets from their own business
CREATE POLICY "business_members_read_assets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'business-assets'
  AND (storage.foldername(name))[1]::integer = (
    SELECT business_id::text::integer
    FROM public.user_details
    WHERE id = auth.uid()
  )
);

-- NOTE: The bucket should be created as PRIVATE (not public)
-- Folder structure: business_id/filename.ext
-- Example: 123/logo-1701234567890.png

COMMENT ON POLICY "business_members_upload_assets" ON storage.objects IS 'Allows business members to upload assets to their business folder';
COMMENT ON POLICY "business_members_read_assets" ON storage.objects IS 'Allows business members to read assets from their business folder';
