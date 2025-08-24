-- Migration: Add BBM ID columns to players table
-- Purpose: Enhanced mapping system to track Basketball Monster IDs alongside UAFBL IDs
-- Date: 2025-08-24

-- Add BBM columns to players table
ALTER TABLE players 
ADD COLUMN bbm_id INTEGER,
ADD COLUMN bbm_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN data_source VARCHAR(20) DEFAULT 'uafbl',
ADD COLUMN bbm_name VARCHAR(255),
ADD COLUMN bbm_matched_at TIMESTAMP,
ADD COLUMN notes TEXT;

-- Create indexes for performance
CREATE INDEX idx_players_bbm_id ON players(bbm_id);
CREATE INDEX idx_players_data_source ON players(data_source);
CREATE INDEX idx_players_bbm_verified ON players(bbm_verified);

-- Add comments for documentation
COMMENT ON COLUMN players.bbm_id IS 'Basketball Monster player ID for external reference';
COMMENT ON COLUMN players.bbm_verified IS 'Whether the BBM mapping has been manually verified';
COMMENT ON COLUMN players.data_source IS 'Source of player data: uafbl, bbm, yahoo';
COMMENT ON COLUMN players.bbm_name IS 'Player name as stored in Basketball Monster system';
COMMENT ON COLUMN players.bbm_matched_at IS 'Timestamp when BBM mapping was established';
COMMENT ON COLUMN players.notes IS 'Additional notes about player mapping or data issues';

-- Verify the migration
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'players' 
  AND column_name IN ('bbm_id', 'bbm_verified', 'data_source', 'bbm_name', 'bbm_matched_at', 'notes')
ORDER BY column_name;