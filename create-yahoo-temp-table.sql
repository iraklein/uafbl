-- Create temporary table for Yahoo roster testing
-- Run this in your Supabase SQL editor before testing Yahoo roster imports

CREATE TABLE IF NOT EXISTS yahoo_rosters_temp (
  id SERIAL PRIMARY KEY,
  league_id TEXT NOT NULL,
  team_key TEXT NOT NULL,
  team_name TEXT,
  manager_name TEXT,
  yahoo_player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  player_positions TEXT[],
  status TEXT,
  raw_data JSONB,
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  season_year INTEGER
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_yahoo_rosters_temp_league_id ON yahoo_rosters_temp(league_id);
CREATE INDEX IF NOT EXISTS idx_yahoo_rosters_temp_yahoo_player_id ON yahoo_rosters_temp(yahoo_player_id);
CREATE INDEX IF NOT EXISTS idx_yahoo_rosters_temp_manager_name ON yahoo_rosters_temp(manager_name);

-- Verify table was created
SELECT 'yahoo_rosters_temp table created successfully' as message;