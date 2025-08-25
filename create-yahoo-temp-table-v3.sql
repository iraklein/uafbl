-- Final optimized Yahoo roster temp table - minimal structure
-- Uses only team_key and yahoo_player_id for maximum efficiency

DROP TABLE IF EXISTS yahoo_rosters_temp;

CREATE TABLE yahoo_rosters_temp (
  id SERIAL PRIMARY KEY,
  team_key TEXT NOT NULL,           -- Yahoo team key (links to managers.yahoo_team_key)
  yahoo_player_id TEXT NOT NULL,   -- Yahoo player ID (links to players.yahoo_player_id)
  status TEXT DEFAULT 'active',    -- Player status from Yahoo
  raw_data JSONB,                   -- Full Yahoo player data for debugging
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure no duplicate player assignments per team
  UNIQUE(team_key, yahoo_player_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_yahoo_rosters_temp_team_key ON yahoo_rosters_temp(team_key);
CREATE INDEX IF NOT EXISTS idx_yahoo_rosters_temp_yahoo_player_id ON yahoo_rosters_temp(yahoo_player_id);

-- Add yahoo_team_key column to managers table for linking
ALTER TABLE managers 
ADD COLUMN IF NOT EXISTS yahoo_team_key TEXT;

-- Add index for the new column
CREATE INDEX IF NOT EXISTS idx_managers_yahoo_team_key ON managers(yahoo_team_key);

-- Verify table was created
SELECT 'Final optimized yahoo_rosters_temp table created successfully' as message;