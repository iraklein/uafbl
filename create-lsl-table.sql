-- Create LSL (League Scouting League) table for high school draft data
-- This was a separate draft for picking high school players before they made it to NBA

CREATE TABLE IF NOT EXISTS lsl_drafts (
    id SERIAL PRIMARY KEY,
    draft_order INTEGER NOT NULL,
    year INTEGER NOT NULL,
    original_team_name VARCHAR(50) NOT NULL,
    draft_team_name VARCHAR(50) NOT NULL,
    player_name VARCHAR(100) NOT NULL,
    draft_price INTEGER,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Kept', 'Unkept')),
    original_manager_id INTEGER REFERENCES managers(id),
    draft_manager_id INTEGER REFERENCES managers(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_lsl_drafts_year ON lsl_drafts(year);
CREATE INDEX IF NOT EXISTS idx_lsl_drafts_draft_order ON lsl_drafts(draft_order);
CREATE INDEX IF NOT EXISTS idx_lsl_drafts_status ON lsl_drafts(status);
CREATE INDEX IF NOT EXISTS idx_lsl_drafts_original_manager ON lsl_drafts(original_manager_id);
CREATE INDEX IF NOT EXISTS idx_lsl_drafts_draft_manager ON lsl_drafts(draft_manager_id);
CREATE INDEX IF NOT EXISTS idx_lsl_drafts_year_order ON lsl_drafts(year, draft_order);

-- Create unique constraint to prevent duplicate entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_lsl_drafts_unique ON lsl_drafts(year, draft_order);