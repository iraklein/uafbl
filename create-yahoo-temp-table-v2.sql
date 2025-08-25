-- Updated Yahoo roster temp table - optimized structure
-- Drop the old table and create a new one with better schema

DROP TABLE IF EXISTS yahoo_rosters_temp;

CREATE TABLE yahoo_rosters_temp (
  id SERIAL PRIMARY KEY,
  team_key TEXT NOT NULL,           -- Yahoo team key (e.g., "466.l.5701.t.1")
  manager_id INTEGER NOT NULL,      -- References your managers table
  yahoo_player_id TEXT NOT NULL,   -- Yahoo player ID to lookup in players table
  status TEXT DEFAULT 'active',    -- Player status (active, injured, etc.)
  raw_data JSONB,                   -- Full Yahoo player data for debugging
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure no duplicate player assignments per team
  UNIQUE(team_key, yahoo_player_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_yahoo_rosters_temp_team_key ON yahoo_rosters_temp(team_key);
CREATE INDEX IF NOT EXISTS idx_yahoo_rosters_temp_manager_id ON yahoo_rosters_temp(manager_id);
CREATE INDEX IF NOT EXISTS idx_yahoo_rosters_temp_yahoo_player_id ON yahoo_rosters_temp(yahoo_player_id);

-- Add foreign key constraint to managers table
ALTER TABLE yahoo_rosters_temp 
ADD CONSTRAINT fk_yahoo_rosters_temp_manager_id 
FOREIGN KEY (manager_id) REFERENCES managers(id);

-- Verify table was created
SELECT 'Optimized yahoo_rosters_temp table created successfully' as message;