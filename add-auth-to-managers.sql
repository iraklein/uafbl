-- Add authentication fields to managers table
ALTER TABLE managers ADD COLUMN email VARCHAR(255) UNIQUE;
ALTER TABLE managers ADD COLUMN password_hash VARCHAR(255);
ALTER TABLE managers ADD COLUMN temp_password VARCHAR(50);
ALTER TABLE managers ADD COLUMN password_reset_required BOOLEAN DEFAULT TRUE;
ALTER TABLE managers ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE managers ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_managers_email ON managers(email);

-- Add some sample emails for existing managers (you can update these)
UPDATE managers SET email = LOWER(manager_name) || '@uafbl.com' WHERE email IS NULL;