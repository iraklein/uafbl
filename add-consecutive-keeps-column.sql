-- Add consecutive_keeps column only to rosters table
ALTER TABLE rosters ADD COLUMN IF NOT EXISTS consecutive_keeps INTEGER DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN rosters.consecutive_keeps IS 'Number of consecutive years this player has been kept before this season (NULL = not a keeper, 0 = first time kept, 1+ = consecutive years)';