-- Updated draft_results table using season_id foreign key
CREATE TABLE IF NOT EXISTS draft_results (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(bbm_id),
    season_id INTEGER NOT NULL REFERENCES seasons(id),
    draft_price INTEGER,
    manager_id INTEGER NOT NULL REFERENCES managers(id),
    is_keeper BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_draft_results_player_id ON draft_results(player_id);
CREATE INDEX IF NOT EXISTS idx_draft_results_season_id ON draft_results(season_id);
CREATE INDEX IF NOT EXISTS idx_draft_results_manager_id ON draft_results(manager_id);
CREATE INDEX IF NOT EXISTS idx_draft_results_season_manager ON draft_results(season_id, manager_id);

-- Create unique constraint to prevent duplicate entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_draft_results_unique ON draft_results(player_id, season_id);