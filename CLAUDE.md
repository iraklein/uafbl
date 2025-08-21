# Claude Code Documentation - UAFBL Project

## 🚨 Important: Supabase 1000-Row Default Limit

### Problem
Supabase queries have a **default limit of 1000 rows** even when you don't specify a limit. This causes issues when:
- Analyzing large datasets (like the players table with 1,130+ rows)
- APIs return incomplete data
- Duplicate analysis misses records
- Data exports are truncated

### Common Symptoms
- API returns exactly 1000 records when expecting more
- Missing records in analysis results
- Incomplete duplicate detection
- Data inconsistencies between expected and actual counts

### Solutions

#### 1. **API Routes - Set Explicit Limits**
```typescript
// In API routes like /api/players/route.ts
const { data, error } = await supabase
  .from('players')
  .select('id, name')
  .order('name', { ascending: true })
  .limit(5000) // ✅ Explicitly set high limit
```

#### 2. **For Very Large Tables - Use Pagination**
```typescript
// For tables with 10,000+ records
const PAGE_SIZE = 1000
let allRecords = []
let page = 0
let hasMore = true

while (hasMore) {
  const { data, error } = await supabase
    .from('large_table')
    .select('*')
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
  
  if (error) throw error
  
  allRecords = [...allRecords, ...data]
  hasMore = data.length === PAGE_SIZE
  page++
}
```

#### 3. **Analysis Scripts - Always Check Total Count**
```javascript
// Before analyzing, verify you have all records
const players = await fetch('/api/players').then(r => r.json())
console.log(`Got ${players.length} players`)

// Expected count check
if (players.length < EXPECTED_TOTAL) {
  console.warn(`⚠️ Only got ${players.length} out of ${EXPECTED_TOTAL} expected records`)
}
```

#### 4. **Database Queries - Count First**
```sql
-- Always check total count first
SELECT COUNT(*) FROM players;

-- Then query with appropriate limit
SELECT * FROM players ORDER BY name LIMIT 2000;
```

### Quick Fixes for Common Tables

#### Players Table (1,130+ records)
```typescript
// src/app/api/players/route.ts
.limit(2000) // Increased from default

// For analysis scripts
const EXPECTED_PLAYER_COUNT = 1130
```

#### Draft Results (varies by season)
```typescript
// Check season-specific counts
const { count } = await supabase
  .from('draft_results')
  .select('*', { count: 'exact', head: true })
  .eq('season_id', seasonId)

// Use appropriate limit
.limit(Math.max(2000, count + 100))
```

### Future Prevention Checklist

When working with large datasets:
- [ ] Check expected record count first
- [ ] Set explicit `.limit()` higher than expected count
- [ ] Verify API returns match expected totals
- [ ] Use pagination for very large tables (10k+ records)
- [ ] Document table sizes in this file

### Table Size Reference
- **players**: ~1,130 records (use limit: 2000)
- **draft_results**: ~500-1000 per season (use limit: 2000)
- **rosters**: ~200-300 per season (use limit: 1000)
- **trades**: ~50-100 per season (use limit: 500)

---

## Project Structure

### Database Schema
- **players**: Player information (1,130+ records)
- **managers**: Team managers
- **seasons**: Fantasy seasons
- **draft_results**: Draft picks per season
- **managers_assets**: Manager budgets/slots
- **toppers**: Topper draft picks
- **lsl**: LSL entries
- **rosters**: Player-team assignments

### Key Files
- **lib/supabase.ts**: Database connection and client creation
- **src/app/api/**: API routes for data access
- **src/components/**: Reusable React components
- **src/app/**: Next.js 15 app router pages

### Navigation Structure
- **Main Tabs**: Rosters, Trades, Draft (with sub-tabs), Draft Results, LSL, Toppers, Admin
- **Draft Sub-tabs**: Draft Tracker, Assets

### Recent Changes
- Merged duplicate LeBron James entries (kept ID 2011)
- Merged duplicate Bronny James entries (ID 6988, renamed from "LeBron James Jr")
- Enhanced Assets page with 7 columns showing draft spending/remaining resources
- Added refresh functionality to bypass cache issues
- Fixed TypeScript build errors with proper null checking

### Common Issues & Solutions
- **Cache Issues**: Use refresh button or `?refresh=true&t=${Date.now()}` parameter
- **TypeScript Errors**: Use non-null assertions (`!`) when Map.get() after has() check
- **Foreign Key Constraints**: Update all referencing tables before deleting players
- **Build Failures**: Run `npm run build` to check for errors before release

---

## 🔄 Player Merge Logic & Documentation

### Overview
Player merging is needed to consolidate duplicate player entries while preserving all historical data across multiple related tables. This is critical for maintaining data integrity in fantasy league management.

### When to Use Player Merging
- **Duplicate Names**: Same player with slight spelling variations (e.g., "Austin Reaves" vs "Austin Reeves")
- **Encoding Issues**: Character encoding differences (e.g., "Bogdan Bogdanović" vs "Bogdan Bogdanovic")
- **Import Errors**: Players accidentally created multiple times during data imports
- **Historical Consolidation**: Merging old and new player entries after database updates

### Database Tables Affected by Player Merges

#### ✅ Currently Handled Tables
1. **`draft_results`** - Draft picks and keeper selections
2. **`toppers`** - Topper draft entries  
3. **`lsl`** - LSL (Last Season's Loser) entries

#### ❌ Tables That Need Additional Handling
4. **`rosters`** - Current player-team assignments
   - **Foreign Key**: `rosters_player_id_fkey` 
   - **Error**: `violates foreign key constraint "rosters_player_id_fkey"`
   - **Fix Required**: Update rosters table before player deletion

#### 🔍 Tables to Investigate
- Check for any other tables with `player_id` foreign keys
- Use this query to find all player references:
```sql
SELECT 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND ccu.table_name = 'players';
```

### Current Merge Process

#### 1. **Basic Merge Steps**
```typescript
// 1. Verify target and source players exist
// 2. Update draft_results table: player_id = targetId WHERE player_id = sourceId
// 3. Update toppers table: player_id = targetId WHERE player_id = sourceId  
// 4. Update lsl table: player_id = targetId WHERE player_id = sourceId
// 5. Delete source player record
```

#### 2. **Known Limitations**
- **Missing rosters table handling** - causes foreign key constraint errors
- **No conflict resolution** - fails when duplicate entries exist in same season/manager
- **No transaction rollback** - partial updates can leave data inconsistent
- **No comprehensive table discovery** - may miss other player references

### Successful Merges Completed

#### Recent Successful Merges (2025-08-20)
- **LeBron James**: ID 1813, 1821 → **ID 2011**
- **Bronny James**: ID 1819, 1827 → **ID 6988** (renamed from "LeBron James Jr")
- **Kevin Knox**: ID 1812, 1824 → **ID 5705**
- **Bol Bol**: ID 1823 → **ID 6114**
- **Cameron Reddish**: ID 1825 → **ID 6109**
- **Darius Bazley**: ID 1810 → **ID 555**
- **Deandre Ayton**: ID 1802, 1816 → **ID 5716**
- **Dwight Howard**: ID 1811 → **ID 10**
- **Frank Ntilikina**: ID 1008, 1818 → **ID 501**
- **R.J. Barrett**: ID 1822 → **ID 6057**
- **Jabari Smith**: ID 1803 → **ID 592**
- **Killian Hayes**: ID 1807 → **ID 6153**
- **Marc Gasol**: ID 1815 → **ID 14**
- **R.J. Hampton**: ID 1832 → **ID 529**
- **De'Aaron Fox**: ID 1805 → **ID 5452**
- **Jaren Jackson Jr**: ID 1806, 1820 → **ID 5698**
- **Larry Nance Jr**: ID 1814 → **ID 5036**
- **Michael Porter Jr**: ID 1817 → **ID 5682**
- **Kelly Oubre Jr**: ID 1011 → **ID 5039**
- **Patrick Baldwin Jr**: ID 1833 → **ID 6536**
- **Austin Reaves**: ID 1801 → **ID 6330**
- **Collin Sexton**: ID 1828 → **ID 5677**
- **Ousmane Dieng**: ID 593 → **ID 6509**

### Failed Merges & Issues

#### ❌ Foreign Key Constraint Errors
- **Dennis Schroeder**: ID 255 → ID 3674
  - **Error**: `rosters_player_id_fkey` constraint violation
  - **Cause**: Player ID 255 has entries in unhandled `rosters` table
  - **Solution**: Update rosters table before deletion

#### ❌ Unique Constraint Violations  
- **Bogdan Bogdanovic**: ID 1009 → ID 3904
  - **Error**: `duplicate key value violates unique constraint "idx_draft_results_unique"`
  - **Cause**: Both players have draft entries for same season/manager combination
  - **Solution**: Implement conflict resolution logic or manual data cleanup

### Complete Merge Script Template

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../../lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  
  try {
    const body = await request.json()
    const { sourceIds, targetId } = body
    
    // Validation
    if (!sourceIds || !Array.isArray(sourceIds) || sourceIds.length === 0) {
      return NextResponse.json({ error: 'sourceIds array is required' }, { status: 400 })
    }
    
    if (!targetId || typeof targetId !== 'number') {
      return NextResponse.json({ error: 'targetId is required and must be a number' }, { status: 400 })
    }
    
    console.log(`Starting merge of players ${sourceIds.join(', ')} into ${targetId}`)
    
    // Get target player info
    const { data: targetPlayer, error: targetError } = await supabase
      .from('players')
      .select('id, name')
      .eq('id', targetId)
      .single()
    
    if (targetError || !targetPlayer) {
      return NextResponse.json({ error: 'Target player not found' }, { status: 404 })
    }
    
    // Get source players info
    const { data: sourcePlayers, error: sourceError } = await supabase
      .from('players')
      .select('id, name')
      .in('id', sourceIds)
    
    if (sourceError) {
      return NextResponse.json({ error: sourceError.message }, { status: 500 })
    }
    
    if (!sourcePlayers || sourcePlayers.length !== sourceIds.length) {
      return NextResponse.json({ error: 'Some source players not found' }, { status: 404 })
    }
    
    console.log(`Target player: ${targetPlayer.name} (${targetPlayer.id})`)
    console.log(`Source players: ${sourcePlayers.map(p => `${p.name} (${p.id})`).join(', ')}`)
    
    // Update all referencing tables
    for (const sourceId of sourceIds) {
      // Update draft_results table
      const { error: draftError } = await supabase
        .from('draft_results')
        .update({ player_id: targetId })
        .eq('player_id', sourceId)
      
      if (draftError) {
        console.error(`Error updating draft_results for player ${sourceId}:`, draftError)
        return NextResponse.json({ error: `Failed to update draft_results: ${draftError.message}` }, { status: 500 })
      }
      
      // Update toppers table
      const { error: toppersError } = await supabase
        .from('toppers')
        .update({ player_id: targetId })
        .eq('player_id', sourceId)
      
      if (toppersError) {
        console.error(`Error updating toppers for player ${sourceId}:`, toppersError)
        return NextResponse.json({ error: `Failed to update toppers: ${toppersError.message}` }, { status: 500 })
      }
      
      // Update lsl table
      const { error: lslError } = await supabase
        .from('lsl')
        .update({ player_id: targetId })
        .eq('player_id', sourceId)
      
      if (lslError) {
        console.error(`Error updating lsl for player ${sourceId}:`, lslError)
        return NextResponse.json({ error: `Failed to update lsl: ${lslError.message}` }, { status: 500 })
      }
      
      // TODO: Add rosters table update
      // const { error: rostersError } = await supabase
      //   .from('rosters')
      //   .update({ player_id: targetId })
      //   .eq('player_id', sourceId)
      
      // TODO: Add any other tables with player_id foreign keys
    }
    
    // Delete source players
    for (const sourceId of sourceIds) {
      const { error: deleteError } = await supabase
        .from('players')
        .delete()
        .eq('id', sourceId)
      
      if (deleteError) {
        console.error(`Error deleting player ${sourceId}:`, deleteError)
        return NextResponse.json({ error: `Failed to delete player ${sourceId}: ${deleteError.message}` }, { status: 500 })
      }
    }
    
    console.log(`Successfully merged ${sourceIds.length} players into player ${targetId}`)
    
    return NextResponse.json({
      success: true,
      message: `Successfully merged ${sourceIds.length} players into player ${targetId} with name "${targetPlayer.name}"`
    })
    
  } catch (error) {
    console.error('Error in merge operation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Future Improvements Needed

#### 1. **Complete Table Discovery**
- Identify ALL tables with player_id foreign keys
- Update merge script to handle rosters table
- Add any other missing table references

#### 2. **Conflict Resolution**
- Handle unique constraint violations gracefully
- Implement smart merge logic for conflicting data
- Add manual override options for complex cases

#### 3. **Transaction Safety**
- Wrap entire merge in database transaction
- Implement proper rollback on any failure
- Add comprehensive error logging

#### 4. **Validation & Safety**
- Pre-merge validation checks
- Dry-run mode to preview changes
- Backup recommendations before major merges

#### 5. **User Interface**
- Admin panel for managing merges
- Visual diff of data being merged
- Confirmation workflows for safety

### Usage Instructions

#### 1. **Creating Temporary Merge Endpoint**
```bash
# Create the merge API endpoint
# Copy the complete merge script above to:
# src/app/api/players/merge/route.ts
```

#### 2. **Starting Development Server**
```bash
npm run dev
# Note the port (usually 3006 due to conflicts)
```

#### 3. **Executing Merge**
```bash
# Single player merge
curl -X POST http://localhost:3006/api/players/merge \
  -H "Content-Type: application/json" \
  -d '{"sourceIds": [1825], "targetId": 6109}'

# Multiple players merge  
curl -X POST http://localhost:3006/api/players/merge \
  -H "Content-Type: application/json" \
  -d '{"sourceIds": [1802, 1816], "targetId": 5716}'
```

#### 4. **Cleanup**
```bash
# Remove temporary endpoint after use
rm -rf src/app/api/players/merge
```

### Best Practices

#### Before Merging
- [ ] Verify player IDs and names are correct
- [ ] Check for existing data conflicts
- [ ] Backup database or test in staging environment
- [ ] Identify target player (usually the one with more recent/complete data)

#### During Merging
- [ ] Monitor console logs for errors
- [ ] Handle foreign key constraint errors by updating missing tables
- [ ] Document any unique issues encountered

#### After Merging
- [ ] Verify merge completed successfully
- [ ] Test affected functionality (draft results, rosters, etc.)
- [ ] Update any cached data or restart services if needed
- [ ] Document the merge in this file

### Troubleshooting Common Errors

#### Foreign Key Constraint Violations
```
Error: "violates foreign key constraint"
```
**Solution**: Update the referenced table before deleting the player

#### Unique Constraint Violations  
```
Error: "duplicate key value violates unique constraint"
```
**Solution**: Implement conflict resolution or manually clean up duplicate data

#### Player Not Found
```
Error: "Target player not found" or "Some source players not found"
```
**Solution**: Verify player IDs exist in database

---

*Last Updated: 2025-08-20*