-- Storage RLS Migration: Grant full CRUD permissions on the 'posts' storage bucket

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Posts Bucket" ON storage.objects;
CREATE POLICY "Public Read Posts Bucket"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'posts');

DROP POLICY IF EXISTS "Allow Upload Posts Bucket" ON storage.objects;
CREATE POLICY "Allow Upload Posts Bucket"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'posts');

DROP POLICY IF EXISTS "Allow Update Posts Bucket" ON storage.objects;
CREATE POLICY "Allow Update Posts Bucket"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'posts')
WITH CHECK (bucket_id = 'posts');

DROP POLICY IF EXISTS "Allow Delete Posts Bucket" ON storage.objects;
CREATE POLICY "Allow Delete Posts Bucket"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'posts');
