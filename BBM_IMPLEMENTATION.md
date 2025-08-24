# BBM ID Implementation Guide

## Overview
Enhanced player ID management system that adds Basketball Monster (BBM) IDs as reference data while keeping existing UAFBL IDs as primary keys.

## Implementation Steps

### 1. Database Migration
```bash
# Apply the database migration to add BBM columns
psql -d your_database -f add-bbm-columns.sql
```

New columns added to `players` table:
- `bbm_id` - Basketball Monster player ID (integer)
- `bbm_verified` - Whether mapping has been manually verified (boolean)
- `data_source` - Source of player data: 'uafbl', 'bbm', 'yahoo' (varchar)
- `bbm_name` - Player name as stored in BBM (varchar)
- `bbm_matched_at` - Timestamp when mapping was established (timestamp)
- `notes` - Additional notes about mapping or data issues (text)

### 2. Import BBM Data
```bash
# Process the BBM_IDs.xls file
npm install xlsx  # If not already installed
node import-bbm-ids.js
```

This will:
- Read your `BBM_IDs.xls` file
- Process and validate the data
- Create `bbm-players-processed.json` with clean data
- Report statistics and any issues found

### 3. Match Players
```bash
# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Dry run first to see what would be matched
node match-bbm-players.js --dry-run

# Run actual matching (with manual confirmation for uncertain matches)
node match-bbm-players.js

# Or run with auto-confirmation for high-confidence matches
node match-bbm-players.js --auto-confirm
```

The matching algorithm:
- **Exact matches** (98%+ similarity): Auto-applied
- **High confidence** (90-98% similarity): Auto-confirmed or prompted
- **Medium confidence** (80-90% similarity): Manual confirmation required
- **Low confidence** (<80% similarity): Skipped

### 4. Review Results
Check `bbm-matching-results.json` for:
- Match statistics
- List of all matched players
- Unmatched BBM players
- Any errors encountered

## Usage After Implementation

### Query Players with BBM Data
```sql
-- All players with BBM IDs
SELECT id, name, bbm_id, bbm_name, bbm_verified 
FROM players 
WHERE bbm_id IS NOT NULL;

-- Players matched vs unmatched
SELECT 
  data_source,
  COUNT(*) as count,
  COUNT(bbm_id) as with_bbm_id
FROM players 
GROUP BY data_source;

-- Verified vs unverified matches
SELECT 
  bbm_verified,
  COUNT(*) as count
FROM players 
WHERE bbm_id IS NOT NULL
GROUP BY bbm_verified;
```

### API Integration
Your existing player APIs will now include BBM data:

```typescript
// Example API response
{
  "id": 2011,
  "name": "LeBron James",
  "bbm_id": 12345,
  "bbm_name": "LeBron James",
  "bbm_verified": true,
  "data_source": "bbm",
  "bbm_matched_at": "2025-08-24T...",
  "notes": "Auto-matched via exact match (similarity: 100.0%)"
}
```

### Manual Corrections
```sql
-- Fix incorrect matches
UPDATE players 
SET bbm_id = correct_bbm_id,
    bbm_verified = true,
    notes = 'Manually corrected'
WHERE id = player_id;

-- Remove incorrect mappings
UPDATE players 
SET bbm_id = NULL,
    bbm_name = NULL,
    bbm_verified = false,
    data_source = 'uafbl',
    notes = 'BBM mapping removed - incorrect match'
WHERE id = player_id;
```

## Benefits

### ✅ Immediate Benefits
- **BBM reference data** for all matched players
- **Data source tracking** for better data governance
- **Yahoo + BBM + UAFBL** unified system
- **Zero breaking changes** to existing functionality

### ✅ Future Benefits  
- **Enhanced player research** using BBM data
- **Cross-platform player verification**
- **Improved duplicate detection**
- **Foundation for future integrations**

## File Structure
```
/uafbl/
├── add-bbm-columns.sql           # Database migration
├── import-bbm-ids.js             # BBM data import script  
├── match-bbm-players.js          # Player matching algorithm
├── BBM_IDs.xls                   # Your BBM source data
├── bbm-players-processed.json    # Processed BBM data
├── bbm-matching-results.json     # Matching results
└── BBM_IMPLEMENTATION.md         # This guide
```

## Troubleshooting

### Common Issues

**1. Missing environment variables**
```bash
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

**2. Excel file format issues**
- Ensure `BBM_IDs.xls` is in the project root
- Check that the file has proper column headers
- Review the sample output from `import-bbm-ids.js`

**3. Database connection issues**
- Verify Supabase credentials are correct
- Ensure the database migration was applied successfully
- Check that RLS policies allow updates

**4. Matching issues**
- Review `bbm-matching-results.json` for details
- Use `--dry-run` to test matching logic
- Manually verify uncertain matches

### Getting Help

1. Check the processing logs for specific error messages
2. Review the generated JSON files for data issues
3. Use SQL queries to inspect the database state
4. Run scripts with `--dry-run` to test without changes

## Next Steps

After successful implementation:

1. **Update CLAUDE.md** with BBM column information
2. **Enhance admin tools** to show BBM data
3. **Add BBM search** to player lookup functions  
4. **Monitor data quality** over time
5. **Plan regular BBM updates** if needed

## Success Metrics

You'll know it worked when:
- ✅ Database migration completes without errors
- ✅ BBM import processes successfully with reasonable match rate
- ✅ Existing functionality continues to work normally
- ✅ New BBM columns populated for matched players
- ✅ Yahoo mappings remain intact and functional