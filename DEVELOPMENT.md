# UAFBL Development Standards

## Purpose
These standards prevent the recurring TypeScript/ESLint issues that cause frequent breakages and development friction.

## TypeScript Guidelines

### ✅ DO: Practical Type Safety
```typescript
// Use proper types for your own data structures
interface Player {
  id: number
  name: string
}

// Use the provided type definitions
import type { Player, Season } from '../lib/types'

// Let TypeScript infer simple return types
function getPlayerName(player: Player) {
  return player.name // TypeScript infers string
}
```

### ⚠️ ALLOWED: Strategic `any` Usage
```typescript
// External library responses (Supabase, etc.)
const { data, error } = await supabase.from('table').select('*')
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const results = data as any[] // OK for external APIs

// Complex transformations during rapid development
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const processedData = complexTransform(rawData as any) // OK temporarily
```

### ❌ AVOID: Strict Typing Where It's Counterproductive
```typescript
// Don't over-type simple functions
function handleClick(): void { // Unnecessary - infer void
  console.log('clicked')
}

// Don't type every parameter if obvious
function updatePlayer(id: number, data: object) { // OK for internal use
  // ...
}
```

## Error Handling Standards

### ✅ DO: Use the Provided Utilities
```typescript
import { safeDatabaseOperation, ApiErrors } from '../lib/api-utils'

// Safe database operations
const result = await safeDatabaseOperation(
  () => supabase.from('players').select('*'),
  'fetch players'
)

if (!result.success) {
  return result.error // Properly typed error response
}
```

### ✅ DO: Handle Errors Gracefully
```typescript
// Use underscore for intentionally unused error parameters
try {
  await riskyOperation()
} catch (_error) {
  // Explicitly ignored
  return fallbackValue
}
```

## Import/Export Standards

### ✅ DO: Use Consistent Import Patterns
```typescript
// Types
import type { Player, Season } from '../lib/types'

// Utilities
import { getConfig, ERROR_MESSAGES } from '../lib/config'
import { validateApiInput } from '../lib/validation'

// Components
import { ErrorBoundary } from '../components/ErrorBoundary'
```

### ✅ DO: Remove Unused Imports Immediately
Use your editor's auto-import cleanup or run:
```bash
npm run lint -- --fix
```

## API Development Standards

### ✅ DO: Use Validation
```typescript
export async function POST(request: NextRequest) {
  // Always validate input
  const validation = validateApiInput(MySchema, await request.json())
  if (!validation.success) {
    return ApiErrors.validationError(validation.error)
  }
  
  // Use validated data
  const { player_id, season_id } = validation.data
}
```

### ✅ DO: Use Safe Database Operations
```typescript
// Instead of raw Supabase calls with manual error handling
const result = await safeDatabaseOperation(
  () => supabase.from('players').select('*'),
  'fetch players context'
)
```

## Build Process

### ✅ DO: Fix Issues During Development
```bash
# Check for issues frequently
npm run lint
npm run build

# Auto-fix what's possible
npm run lint -- --fix
```

### ⚠️ WHEN Issues Arise:
1. **Unused imports**: Remove them immediately
2. **Unused variables**: Prefix with `_` if intentional
3. **`any` types**: Add eslint-disable comment if needed
4. **Complex types**: Use the provided interfaces in `lib/types.ts`

## Configuration Values

### ✅ DO: Use Config Constants
```typescript
import { getConfig, APP_CONFIG } from '../lib/config'

// Instead of magic numbers
const timeout = APP_CONFIG.AUTH_TIMEOUT_MS
const seasonId = getConfig('CURRENT_SEASON_ID')
```

### ❌ AVOID: Hardcoded Values
```typescript
// Bad
const timeout = 3000
if (seasonId === 1) { return 19 }

// Good
const timeout = APP_CONFIG.AUTH_TIMEOUT_MS
const prevSeason = getPreviousSeasonId(seasonId)
```

## Common Patterns to Prevent Breakages

### Error Boundaries
```typescript
// Wrap risky components
<ErrorBoundary>
  <DataFetchingComponent />
</ErrorBoundary>
```

### Safe Operations
```typescript
// Always check if data exists
const players = data?.players || []
const firstPlayer = players[0] // Might be undefined
const playerName = firstPlayer?.name || 'Unknown'
```

### Type Guards
```typescript
function isValidPlayer(data: unknown): data is Player {
  return typeof data === 'object' && 
         data !== null && 
         'id' in data && 
         'name' in data
}
```

## Emergency Fixes

If you encounter build-breaking issues:

1. **Quick fix for any types**:
   ```typescript
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   const data = response as any
   ```

2. **Quick fix for unused vars**:
   ```typescript
   const _unusedVar = getValue() // Prefix with underscore
   ```

3. **Skip strict checks temporarily**:
   ```typescript
   // @ts-ignore
   problematicLine()
   ```

These should be temporary and cleaned up later, but they prevent deployment blocks.

## Common Naming/Mapping Issues and Fixes

This section documents recurring issues with data mapping and database relationships to prevent future breakages.

### ❌ Database Column Mismatches
**Issue**: Code references database columns that don't exist or have different names.

**Example Problems**:
```sql
-- trades table doesn't have 'notes' column
SELECT notes FROM trades; -- ERROR

-- draft_results relationship naming
SELECT seasons.year FROM draft_results WHERE seasons.id = 1; -- May fail due to relationship setup
```

**✅ Solutions**:
```typescript
// Always verify column existence before querying
const { data: trades } = await supabase
  .from('trades')
  .select(`
    id,
    season_id,
    player_id,
    created_at,
    players (id, name),
    seasons (id, year, name)
  `)
  // DO NOT include 'notes' - column doesn't exist

// Use explicit relationship syntax
.select(`
  id,
  draft_price,
  seasons!inner (year)
`)
.eq('seasons.id', seasonId) // Use ID for joins, not year
```

### ❌ Season ID Logic Issues
**Issue**: Hardcoded season relationships that break when data changes.

**Example Problems**:
```typescript
// BAD: Hardcoded assumptions
const previousSeasonId = parseInt(seasonId) === 1 ? 19 : parseInt(seasonId) - 1
if (seasonId === 1) { return 19 } // Magic numbers

// BAD: Year-based queries that may not match data
.eq('seasons.year', 2024) // What if 2024 season has different ID?
```

**✅ Solutions**:
```typescript
// GOOD: Use config helper functions
import { getPreviousSeasonId } from '../lib/config'
const previousSeasonId = getPreviousSeasonId(seasonId)

// GOOD: Use ID-based queries when possible
.eq('seasons.id', seasonId) // More reliable than year-based

// GOOD: Handle the 2025-26 → 2024-25 mapping in one place
export function getPreviousSeasonId(currentSeasonId: number): number {
  if (currentSeasonId === 1) return 19 // 2025-26 → 2024-25
  return currentSeasonId - 1
}
```

### ❌ Draft Price Calculation Confusion
**Issue**: Mixing "current season" vs "previous season" data for different use cases.

**Example Problems**:
```typescript
// BAD: Using previous season data for current roster display
.eq('seasons.year', previousSeasonYear) // Shows wrong draft prices

// BAD: Using current season data for keeper calculations
.eq('seasons.year', currentSeasonYear) // Calculates wrong keeper costs
```

**✅ Solutions**:
```typescript
// FOR ROSTERS PAGE: Show current season draft prices
const { data: draftPrices } = await supabase
  .from('draft_results')
  .select(`player_id, draft_price, seasons!inner (id)`)
  .eq('seasons.id', seasonId) // Current season

// FOR KEEPER CALCULATIONS: Use previous season draft prices
const { data: draftData } = await supabase
  .from('draft_results')
  .select(`draft_price, seasons!inner (year)`)
  .eq('player_id', playerId)
  .eq('seasons.id', previousSeasonId) // Previous season
```

### ❌ Relationship Data Structure Issues
**Issue**: Inconsistent handling of single vs array relationships.

**Example Problems**:
```typescript
// BAD: Assuming relationship structure
const playerId = roster.players.id // Might be array or single object
const playerName = roster.players[0].name // Might not be array
```

**✅ Solutions**:
```typescript
// GOOD: Handle both single and array cases
const playerId = Array.isArray(roster.players) 
  ? roster.players[0]?.id || 0 
  : roster.players?.id || 0

// GOOD: Use proper type checking
function getPlayerFromRoster(roster: Roster): Player | null {
  if (Array.isArray(roster.players)) {
    return roster.players[0] || null
  }
  return roster.players || null
}
```

### ❌ Query Parameter Type Mismatches
**Issue**: URL parameters are strings but code expects numbers.

**Example Problems**:
```typescript
// BAD: Direct comparison without conversion
const seasonId = searchParams.get('season_id')
if (seasonId === 1) { ... } // '1' !== 1

// BAD: Unsafe parseInt without validation
const id = parseInt(seasonId) // NaN if seasonId is null
```

**✅ Solutions**:
```typescript
// GOOD: Use validation schemas
const paramValidation = parseQueryParams(SeasonIdQuerySchema, searchParams)
if (!paramValidation.success) {
  return ApiErrors.badRequest(paramValidation.error)
}
const { season_id: seasonId } = paramValidation.data // Guaranteed to be number

// GOOD: Safe parsing with defaults
const seasonId = parseInt(searchParams.get('season_id') || '0', 10) || 0
if (!isValidSeasonId(seasonId)) {
  return ApiErrors.badRequest('Invalid season ID')
}
```

### 🔧 Quick Debugging Checklist

When a query fails, check:

1. **Column exists**: `\d table_name` in database to verify columns
2. **Relationship syntax**: Use `table!inner` for required joins
3. **ID vs Year**: Prefer ID-based queries over year-based when possible
4. **Data types**: URL params are strings, convert to numbers safely
5. **Array vs Object**: Handle both relationship return types
6. **Season logic**: Use config helpers instead of hardcoded mappings

### 🛠️ Database Verification Commands

```sql
-- Check table structure
\d trades
\d draft_results
\d rosters

-- Verify relationship data
SELECT id, year, name FROM seasons ORDER BY id;
SELECT player_id, draft_price, season_id FROM draft_results WHERE season_id IN (1, 19);

-- Check for missing data
SELECT COUNT(*) FROM draft_results WHERE season_id = 19; -- Should have 2024 data
SELECT COUNT(*) FROM draft_results WHERE season_id = 1;  -- Should have 2025 data
```

## Summary

The goal is **practical type safety** that helps development rather than hindering it. Use the provided utilities, follow the patterns, and prioritize shipping working code over perfect types.

**Key Principles**:
1. **Centralize configuration** - No magic numbers
2. **Validate inputs** - Use schemas for all API parameters  
3. **Handle edge cases** - Arrays vs objects, null values, missing data
4. **Use type safety** - Import proper interfaces
5. **Debug systematically** - Check database structure first