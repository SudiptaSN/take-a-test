DROP POLICY IF EXISTS "candidate read own invite" ON invites;

CREATE POLICY "candidate read own invite" ON invites FOR SELECT TO authenticated
  USING (lower(email) = lower(auth.jwt() ->> 'email'));
