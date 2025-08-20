-- Disable RLS on the remaining tables
ALTER TABLE rosters DISABLE ROW LEVEL SECURITY;
ALTER TABLE managers DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies (in case they're causing issues)
DROP POLICY IF EXISTS "Only invited managers can access" ON managers;
DROP POLICY IF EXISTS "Only invited managers can access rosters" ON rosters;