ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sprint_target_date timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sprint_title text;
