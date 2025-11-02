-- Make the chat-media bucket public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'chat-media';