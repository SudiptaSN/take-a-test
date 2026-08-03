-- Migration: Add appeals table, extra_minutes/paused_at to attempts for admin time controls

-- New columns on attempts for admin time control & pause
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS extra_minutes int NOT NULL DEFAULT 0;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS paused_at timestamptz;

-- Appeals table for terminated candidates to request a retest
CREATE TABLE IF NOT EXISTS appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',  -- pending, approved, rejected
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE (attempt_id)
);

ALTER TABLE appeals ENABLE ROW LEVEL SECURITY;

-- Candidates can insert their own appeals and read them
CREATE POLICY "candidate insert own appeal" ON appeals FOR INSERT
  WITH CHECK (candidate_id = auth.uid());
CREATE POLICY "candidate read own appeal" ON appeals FOR SELECT
  USING (candidate_id = auth.uid());

-- Admins can do everything on appeals
CREATE POLICY "admin manage appeals" ON appeals FOR ALL
  USING (EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
