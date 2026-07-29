ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gemini_key text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gemini_key_shared boolean not null default false;
