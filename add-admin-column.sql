-- Add is_admin column to managers table
ALTER TABLE managers ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;

-- Set dhaight@gmail.com as admin
UPDATE managers SET is_admin = TRUE WHERE email = 'dhaight@gmail.com';

-- Set all other managers as non-admin (this should already be false by default, but being explicit)
UPDATE managers SET is_admin = FALSE WHERE email != 'dhaight@gmail.com';