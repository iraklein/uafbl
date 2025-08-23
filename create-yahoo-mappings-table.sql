-- Create yahoo_player_mappings table
CREATE TABLE yahoo_player_mappings (
  id SERIAL PRIMARY KEY,
  yahoo_player_id VARCHAR(20) NOT NULL UNIQUE,
  yahoo_player_key VARCHAR(30) NOT NULL UNIQUE, -- e.g., "466.p.5352"
  uafbl_player_id INTEGER,
  yahoo_name_full VARCHAR(100) NOT NULL,
  yahoo_name_first VARCHAR(50),
  yahoo_name_last VARCHAR(50),
  yahoo_name_ascii_full VARCHAR(100),
  yahoo_positions TEXT[], -- Array of positions like ['PG', 'SG']
  yahoo_team_abbr VARCHAR(10),
  yahoo_team_full VARCHAR(100),
  yahoo_uniform_number VARCHAR(10),
  yahoo_image_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE, -- Admin confirmed mapping is correct
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for fast lookups
CREATE INDEX idx_yahoo_player_mappings_yahoo_id ON yahoo_player_mappings(yahoo_player_id);
CREATE INDEX idx_yahoo_player_mappings_uafbl_id ON yahoo_player_mappings(uafbl_player_id);
CREATE INDEX idx_yahoo_player_mappings_name ON yahoo_player_mappings(yahoo_name_full);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_yahoo_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_yahoo_mappings_updated_at
  BEFORE UPDATE ON yahoo_player_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_yahoo_mappings_updated_at();

-- Add foreign key constraint separately
ALTER TABLE yahoo_player_mappings 
ADD CONSTRAINT fk_yahoo_mappings_player 
FOREIGN KEY (uafbl_player_id) REFERENCES players(id) ON DELETE CASCADE;