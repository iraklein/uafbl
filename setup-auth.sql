-- Add email column to managers table for auth integration
ALTER TABLE managers ADD COLUMN email VARCHAR(255) UNIQUE;

-- Add some sample emails (you can update these to real emails)
UPDATE managers SET email = LOWER(REPLACE(manager_name, ' ', '.')) || '@gmail.com' WHERE email IS NULL;

-- Enable Row Level Security on all tables
ALTER TABLE managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE toppers ENABLE ROW LEVEL SECURITY;
ALTER TABLE lsl ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_assets ENABLE ROW LEVEL SECURITY;

-- Create policy to only allow access to users whose email exists in managers table
CREATE POLICY "Only invited managers can access" ON managers
  FOR ALL USING (auth.jwt() ->> 'email' = email);

CREATE POLICY "Only invited managers can access rosters" ON rosters
  FOR ALL USING (auth.jwt() ->> 'email' IN (SELECT email FROM managers));

CREATE POLICY "Only invited managers can access draft_results" ON draft_results
  FOR ALL USING (auth.jwt() ->> 'email' IN (SELECT email FROM managers));

CREATE POLICY "Only invited managers can access players" ON players
  FOR ALL USING (auth.jwt() ->> 'email' IN (SELECT email FROM managers));

CREATE POLICY "Only invited managers can access seasons" ON seasons
  FOR ALL USING (auth.jwt() ->> 'email' IN (SELECT email FROM managers));

CREATE POLICY "Only invited managers can access trades" ON trades
  FOR ALL USING (auth.jwt() ->> 'email' IN (SELECT email FROM managers));

CREATE POLICY "Only invited managers can access toppers" ON toppers
  FOR ALL USING (auth.jwt() ->> 'email' IN (SELECT email FROM managers));

CREATE POLICY "Only invited managers can access lsl" ON lsl
  FOR ALL USING (auth.jwt() ->> 'email' IN (SELECT email FROM managers));

CREATE POLICY "Only invited managers can access manager_assets" ON manager_assets
  FOR ALL USING (auth.jwt() ->> 'email' IN (SELECT email FROM managers));