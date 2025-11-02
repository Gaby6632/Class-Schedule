-- Add gradient colors to profiles for admins
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gradient_start text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gradient_end text;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can create notifications for all users"
ON notifications FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'developer'::app_role));

-- Create chat read tracking table
CREATE TABLE IF NOT EXISTS chat_read_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  last_read_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on chat_read_status
ALTER TABLE chat_read_status ENABLE ROW LEVEL SECURITY;

-- Policies for chat_read_status
CREATE POLICY "Users can view their own read status"
ON chat_read_status FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own read status"
ON chat_read_status FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own read status"
ON chat_read_status FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Function to notify users when public notes change
CREATE OR REPLACE FUNCTION notify_notes_change()
RETURNS TRIGGER AS $$
DECLARE
  admin_name text;
  user_record record;
BEGIN
  -- Get admin's display name
  SELECT display_name INTO admin_name
  FROM profiles
  WHERE id = auth.uid();

  -- Create notification for all users except the admin who made the change
  FOR user_record IN SELECT id FROM auth.users WHERE id != auth.uid()
  LOOP
    INSERT INTO notifications (user_id, type, message)
    VALUES (user_record.id, 'notes_change', admin_name || ' changed the notes');
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for notes changes
CREATE TRIGGER on_public_notes_update
AFTER UPDATE ON notes
FOR EACH ROW
WHEN (NEW.is_public = true)
EXECUTE FUNCTION notify_notes_change();