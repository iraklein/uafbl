-- Fix Steph Curry / Stephen Curry duplicate
-- Steph Curry ID: 1808
-- Stephen Curry ID: 2999

-- First, update any records pointing to "Steph Curry" (1808) to point to "Stephen Curry" (2999)

-- Update draft_results
UPDATE draft_results 
SET player_id = 2999 
WHERE player_id = 1808;

-- Update toppers
UPDATE toppers 
SET player_id = 2999 
WHERE player_id = 1808;

-- Update LSL
UPDATE lsl 
SET player_id = 2999 
WHERE player_id = 1808;

-- Update rosters
UPDATE rosters 
SET player_id = 2999 
WHERE player_id = 1808;

-- Update trades
UPDATE trades 
SET player_id = 2999 
WHERE player_id = 1808;

-- Finally, delete the duplicate "Steph Curry" player record
DELETE FROM players 
WHERE id = 1808;

-- Verify the fix
SELECT 'Stephen Curry records after merge:' as description;
SELECT 'Draft Results:' as table_name, COUNT(*) as count FROM draft_results WHERE player_id = 2999
UNION ALL
SELECT 'Toppers:' as table_name, COUNT(*) as count FROM toppers WHERE player_id = 2999
UNION ALL
SELECT 'LSL:' as table_name, COUNT(*) as count FROM lsl WHERE player_id = 2999
UNION ALL
SELECT 'Rosters:' as table_name, COUNT(*) as count FROM rosters WHERE player_id = 2999
UNION ALL
SELECT 'Trades:' as table_name, COUNT(*) as count FROM trades WHERE player_id = 2999;