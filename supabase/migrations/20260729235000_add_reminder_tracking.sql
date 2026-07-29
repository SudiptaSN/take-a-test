ALTER TABLE tests ADD COLUMN IF NOT EXISTS reminder_24h_sent boolean not null default false;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS reminder_1h_sent boolean not null default false;
