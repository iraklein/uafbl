# Claude Code Documentation - UAFBL Project

## 🚨 Important: Supabase 1000-Row Default Limit

### Problem
Supabase queries have a **default limit of 1000 rows** even when you don't specify a limit. This causes issues when:
- Analyzing large datasets (like the players table with 1,087 rows)
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
- **players**: 1,087 records (use pagination in API routes - see BBM mappings API example)
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

## 🛠️ TypeScript Build Error Patterns & Solutions

### Overview
During development, certain TypeScript patterns cause repeated compilation errors. This section documents common errors and their fixes to prevent future issues.

### Common Build Error Patterns

#### 1. **Array Type Inference Issues**
**Error Pattern:**
```
Type error: Argument of type '{ ... }' is not assignable to parameter of type 'never'.
```

**Root Cause:** Empty arrays (`[]`) are inferred as `never[]` type, preventing any objects from being pushed.

**Solution:** Always explicitly type arrays when building objects for database insertion:
```typescript
// ❌ Bad - TypeScript infers never[]
const rosterEntries = []

// ✅ Good - Explicit type annotation
const rosterEntries: Array<{
  team_key: string
  yahoo_player_id: string
  status: string
  raw_data: any
}> = []
```

#### 2. **Unknown Type in Object Index Access**
**Error Pattern:**
```
Type error: Type 'unknown' cannot be used as an index type.
```

**Root Cause:** Supabase queries return `unknown` types for dynamic properties, which cannot be used as object keys.

**Solution:** Convert to string before using as object index:
```typescript
// ❌ Bad - unknown type as index
teamSummary[entry.team_key] = 0

// ✅ Good - Convert to string
const teamKey = String(entry.team_key || '')
teamSummary[teamKey] = 0
```

#### 3. **Object Literal Type Issues**
**Root Cause:** TypeScript cannot infer complex object structures, especially with optional/unknown properties.

**Solution:** Type the containing object explicitly:
```typescript
// ❌ Bad - Inferred as {}
const teamSummary = {}

// ✅ Good - Explicit typing
const teamSummary: Record<string, number> = {}
```

#### 4. **Error Object Type in Catch Blocks**
**Error Pattern:**
```
Type error: 'error' is of type 'unknown'.
```

**Root Cause:** TypeScript 5+ treats catch block errors as `unknown` instead of `Error`.

**Solution:** Type guard before accessing error properties:
```typescript
// ❌ Bad - Direct property access
catch (error) {
  console.error('Error:', error.message)
}

// ✅ Good - Type guard
catch (error) {
  console.error('Error:', error instanceof Error ? error.message : 'Unknown error')
}
```

#### 5. **Supabase Query Result Types**
**Root Cause:** Complex Supabase joins/selects return deeply nested unknown types.

**Solution:** Extract and type data defensively:
```typescript
// ❌ Bad - Direct access to nested unknown
managers?.forEach(m => managerMap[m.yahoo_team_key] = m.manager_name)

// ✅ Good - Type guard and conversion
managers?.forEach(m => {
  if (m.yahoo_team_key) {
    managerMap[String(m.yahoo_team_key)] = String(m.manager_name)
  }
})
```

### Pre-Build Checklist

Before running `npm run build`, check for these patterns:

- [ ] **Empty Arrays**: All `[]` declarations have explicit types when objects will be pushed
- [ ] **Object Indexing**: All dynamic property access uses `String()` conversion
- [ ] **Object Literals**: Complex objects have explicit `Record<string, type>` annotations  
- [ ] **Error Handling**: All catch blocks use `error instanceof Error` checks
- [ ] **Supabase Results**: All query results are typed defensively with null checks

### Quick Fix Commands

**Find potential array issues:**
```bash
grep -r "const.*= \[\]" src/ --include="*.ts" --include="*.tsx"
```

**Find potential object indexing issues:**
```bash
grep -r "\[.*\.\w\+\]" src/ --include="*.ts" --include="*.tsx"
```

**Find catch blocks without type guards:**
```bash
grep -A 1 "catch.*error" src/ --include="*.ts" --include="*.tsx" | grep -v "instanceof"
```

### Build Testing Strategy

1. **Run build early and often** - Don't wait until the end
2. **Fix TypeScript errors immediately** - They compound quickly  
3. **Use explicit typing proactively** - Don't rely on inference for complex data
4. **Test with real data structures** - Mock data often hides type issues

### Yahoo API Integration Specific Issues

**Yahoo API Response Structures:** 
- Deeply nested arrays and objects from Yahoo's XML-to-JSON conversion
- Dynamic property names (team keys, player IDs as object keys)  
- Mixed data types in the same response structure

**Common Patterns:**
```typescript
// Yahoo team data structure
const teams: Array<{
  team_key: any      // Can be string or number
  team_id: any       // Can be string or number  
  name: any          // Can be string or null
  manager_nickname: any // Can be string or undefined
}> = []

// Yahoo roster entries
const allRosterEntries: Array<{
  team_key: any
  yahoo_player_id: any
  status: any
  raw_data: any
}> = []
```

**Note:** Using `any` for Yahoo API data is intentional due to inconsistent response formats from their XML-to-JSON conversion.

---

## 🔐 Security & Credentials Management

### Yahoo OAuth Credentials Protection

**Problem:** Yahoo OAuth credentials were previously exposed in git history, creating security vulnerabilities.

**Current Protection Measures:**

#### 1. **Environment Variables Only**
```bash
# .env.local (never committed)
YAHOO_CLIENT_ID=your_actual_client_id_here
YAHOO_CLIENT_SECRET=your_actual_client_secret_here
```

#### 2. **Git Ignore Patterns**
```gitignore
# Environment files
.env*

# Yahoo OAuth tokens (contain sensitive access tokens)  
yahoo-tokens.json
```

#### 3. **Runtime Token Management**
- Access tokens expire every 1 hour
- Refresh tokens used to get new access tokens
- Token files excluded from git tracking via `.gitignore`

#### 4. **Code Review Checklist**
Before committing Yahoo-related code:
- [ ] No hardcoded credentials in any files
- [ ] All credentials use `process.env.VARIABLE_NAME`
- [ ] Token files are in `.gitignore`  
- [ ] No credentials in console.log statements
- [ ] Test files use placeholder/mock credentials

#### 5. **Security Incident Response**
If credentials are accidentally committed:
1. **Immediately revoke** the exposed credentials at https://developer.yahoo.com/apps/
2. **Generate new credentials** and update `.env.local`
3. **Rewrite git history** if necessary to remove the commit
4. **Update this documentation** with lessons learned

---

*Last Updated: 2025-08-25*