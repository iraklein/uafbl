-- Make players.id auto-incrementing so we don't need to manually assign IDs
-- This will allow us to create players without specifying an ID

-- First, find the current maximum ID to set the sequence
SELECT setval('players_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM players), false);

-- Make the id column default to the next sequence value
ALTER TABLE players ALTER COLUMN id SET DEFAULT nextval('players_id_seq');

-- Verify the change
\d players;