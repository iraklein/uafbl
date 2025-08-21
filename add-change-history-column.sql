-- Add change_history JSONB column to managers_assets table
-- This will store an array of change records for audit tracking

ALTER TABLE managers_assets 
ADD COLUMN IF NOT EXISTS change_history JSONB DEFAULT '[]';

-- Add comment for documentation
COMMENT ON COLUMN managers_assets.change_history IS 'JSON array storing history of admin changes to cash/slots';

-- Example of what the JSON structure will look like:
-- [
--   {
--     "timestamp": "2025-08-21T10:30:00Z",
--     "admin_email": "admin@email.com",
--     "changes": {
--       "available_cash": {"from": 200, "to": 190},
--       "available_slots": {"from": 14, "to": 13}
--     },
--     "reason": "trade adjustment"
--   }
-- ]