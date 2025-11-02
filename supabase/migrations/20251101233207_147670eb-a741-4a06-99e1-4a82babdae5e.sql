-- Update RLS policy for public notes creation
DROP POLICY IF EXISTS "Users can create notes" ON public.notes;

-- Only admins can create public notes, regular users can only create private notes
CREATE POLICY "Admins can create public notes" 
ON public.notes 
FOR INSERT 
WITH CHECK (
  (is_public = true AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'developer'::app_role)))
  OR (is_public = false AND auth.uid() = user_id)
);