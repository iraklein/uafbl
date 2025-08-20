-- Create topper table for tracking topper history
-- Toppers are players that managers select to represent them in competitions

CREATE TABLE IF NOT EXISTS toppers (
    id SERIAL PRIMARY KEY,
    manager_id INTEGER NOT NULL REFERENCES managers(id),
    player_id INTEGER NOT NULL REFERENCES players(id),
    season_id INTEGER NOT NULL REFERENCES seasons(id),
    is_winner BOOLEAN DEFAULT FALSE, -- Indicates if this manager won with this topper
    is_unused BOOLEAN DEFAULT FALSE, -- Topper was unused/inactive
    notes TEXT, -- Additional notes (e.g., "quad", "with Phil", etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_toppers_manager_id ON toppers(manager_id);
CREATE INDEX IF NOT EXISTS idx_toppers_player_id ON toppers(player_id);
CREATE INDEX IF NOT EXISTS idx_toppers_season_id ON toppers(season_id);
CREATE INDEX IF NOT EXISTS idx_toppers_is_winner ON toppers(is_winner);
CREATE INDEX IF NOT EXISTS idx_toppers_season_manager ON toppers(season_id, manager_id);
CREATE INDEX IF NOT EXISTS idx_toppers_season_player ON toppers(season_id, player_id);

-- Create unique constraint to prevent duplicate manager-season entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_toppers_unique ON toppers(manager_id, season_id);

-- Add comment to table
COMMENT ON TABLE toppers IS 'Tracks topper selections by managers for each season. Multiple managers can select the same player (calculated via COUNT). Winners indicated by is_winner flag.';