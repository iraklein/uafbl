-- Create trades table for tracking player trades during seasons
-- Each row represents one trade occurrence for a player

CREATE TABLE IF NOT EXISTS trades (
    id SERIAL PRIMARY KEY,
    season_id INTEGER NOT NULL REFERENCES seasons(id),
    player_id INTEGER NOT NULL REFERENCES players(id),
    notes TEXT, -- Optional notes about the trade
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trades_season_id ON trades(season_id);
CREATE INDEX IF NOT EXISTS idx_trades_player_id ON trades(player_id);
CREATE INDEX IF NOT EXISTS idx_trades_season_player ON trades(season_id, player_id);

-- Add comment to table
COMMENT ON TABLE trades IS 'Tracks individual trade occurrences for players during seasons. Each row = one trade. Count rows to get total trades for keeper cost calculation.';