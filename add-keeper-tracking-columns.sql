-- Add consecutive_keeps and trades columns to rosters table
-- These are needed to calculate keeper costs properly

ALTER TABLE rosters 
ADD COLUMN IF NOT EXISTS consecutive_keeps INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trades INTEGER DEFAULT 0;

-- Add comments to explain the columns
COMMENT ON COLUMN rosters.consecutive_keeps IS 'Number of consecutive years this player has been kept (0 = first time kept)';
COMMENT ON COLUMN rosters.trades IS 'Number of trades during the season, each adds $5 to keeper cost';