-- Create rosters table for storing player-manager assignments by season
CREATE TABLE rosters (
    id SERIAL PRIMARY KEY,
    season_id INTEGER NOT NULL REFERENCES seasons(id),
    player_id INTEGER NOT NULL REFERENCES players(id),
    manager_id INTEGER NOT NULL REFERENCES managers(id),
    keeper_cost INTEGER NULL, -- Will be populated later with formula
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique combination of season, player, and manager
    CONSTRAINT unique_season_player_manager UNIQUE(season_id, player_id, manager_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_rosters_season_id ON rosters(season_id);
CREATE INDEX idx_rosters_player_id ON rosters(player_id);
CREATE INDEX idx_rosters_manager_id ON rosters(manager_id);
CREATE INDEX idx_rosters_season_manager ON rosters(season_id, manager_id);