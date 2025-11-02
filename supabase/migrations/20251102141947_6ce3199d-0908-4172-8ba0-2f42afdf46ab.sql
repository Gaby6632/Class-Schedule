-- Create private_messages table first
CREATE TABLE private_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  message_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'image', 'audio'
  file_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CHECK (message_type IN ('text', 'image', 'audio')),
  CHECK (
    (message_type = 'text' AND content IS NOT NULL) OR
    (message_type IN ('image', 'audio') AND file_url IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE private_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for private_messages
CREATE POLICY "Users can view messages they sent or received"
ON private_messages
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send private messages"
ON private_messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages"
ON private_messages
FOR DELETE
USING (auth.uid() = sender_id);

CREATE POLICY "Users can mark messages as read if they are the receiver"
ON private_messages
FOR UPDATE
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

-- Create index for faster queries
CREATE INDEX idx_private_messages_sender ON private_messages(sender_id);
CREATE INDEX idx_private_messages_receiver ON private_messages(receiver_id);
CREATE INDEX idx_private_messages_created_at ON private_messages(created_at DESC);

-- Enable realtime for private messages
ALTER PUBLICATION supabase_realtime ADD TABLE private_messages;

-- Create storage bucket for chat media (images and audio)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media',
  'chat-media',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'audio/webm', 'audio/mpeg', 'audio/wav', 'audio/ogg']
);

-- Create RLS policies for chat media bucket
CREATE POLICY "Users can upload their own chat media"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'chat-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view chat media they sent or received"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'chat-media' AND
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (
      SELECT 1 FROM private_messages
      WHERE (sender_id = auth.uid() OR receiver_id = auth.uid())
      AND file_url LIKE '%' || name || '%'
    )
  )
);

CREATE POLICY "Users can delete their own chat media"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'chat-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Update chat_messages table to support file uploads
ALTER TABLE chat_messages ADD COLUMN message_type TEXT DEFAULT 'text';
ALTER TABLE chat_messages ADD COLUMN file_url TEXT;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_type_check CHECK (message_type IN ('text', 'image', 'audio'));