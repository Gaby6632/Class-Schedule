-- Drop the old policy that allows everyone to edit public notes
DROP POLICY IF EXISTS "Public notes are editable by everyone" ON notes;

-- Create new policy: only admins can edit public notes
CREATE POLICY "Only admins can edit public notes"
ON notes
FOR UPDATE
USING (is_public = true AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'developer'::app_role)));