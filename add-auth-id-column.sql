-- Add auth_id column to managers table to link with Supabase auth.users
ALTER TABLE managers ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_managers_auth_id ON managers(auth_id);
CREATE INDEX IF NOT EXISTS idx_managers_email ON managers(email);