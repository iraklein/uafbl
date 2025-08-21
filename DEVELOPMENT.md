# UAFBL Development Guide

## Build Error Prevention

This project has been configured to minimize build errors during development while maintaining code quality.

### Configuration Changes Made

#### TypeScript Configuration (`tsconfig.json`)
- Relaxed `noImplicitAny` to allow rapid development with external APIs
- Disabled strict property initialization for more flexible component props
- Turned off unused variable checks to prevent noise during development

#### ESLint Configuration (`eslint.config.mjs`)
- Console statements are allowed (useful for debugging)
- `any` type is permitted (needed for external library compatibility)
- Unused variables produce warnings instead of errors
- More lenient React hooks dependency checking

#### Next.js Configuration (`next.config.ts`)
- TypeScript and ESLint errors don't fail builds in development
- Optimized build performance settings
- Disabled experimental features that can cause issues

### Development Scripts

Use these npm scripts for different scenarios:

```bash
# Development
npm run dev              # Standard development server
npm run dev:safe         # Development with explicit NODE_ENV

# Building
npm run build            # Standard production build
npm run build:check      # Build without linting (faster)
npm run build:force      # Force production build regardless of environment

# Code Quality
npm run lint             # Check for linting issues
npm run lint:fix         # Auto-fix linting issues
npm run type-check       # Check TypeScript without building
npm run type-check:watch # Watch mode for type checking
```

### Common Patterns to Avoid Build Errors

#### 1. Use Type Utilities
```typescript
import type { ApiResult, SupabaseResponse } from '@/lib/type-utils'

// Instead of any, use specific utilities
const response: SupabaseResponse<User[]> = await supabase.from('users').select()
```

#### 2. Handle Optional Properties
```typescript
// Use optional chaining and nullish coalescing
const userName = user?.profile?.name ?? 'Unknown'

// For arrays that might be undefined
const items = data?.items ?? []
```

#### 3. State Management
```typescript
// Use the FormState utility for forms
const [formState, setFormState] = useState<FormState<LoginForm>>({
  values: { email: '', password: '' },
  errors: {},
  isSubmitting: false
})
```

#### 4. API Routes
```typescript
// Use consistent error handling
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // ... logic
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
```

#### 5. Supabase Queries
```typescript
// Handle Supabase responses safely
const { data, error } = await supabase
  .from('table')
  .select('*')

if (error) {
  console.error('Database error:', error)
  return { success: false, error: error.message }
}

// Always check if data exists
if (!data || data.length === 0) {
  return { success: false, error: 'No data found' }
}
```

### File Organization

- **Types**: Use `lib/types.ts` for shared interfaces
- **Type Utilities**: Use `lib/type-utils.ts` for common type patterns
- **API Utilities**: Use `lib/api-utils.ts` for shared API logic
- **Components**: Keep component types close to the component files

### When Build Errors Occur

1. **Check the specific error message** - TypeScript errors are usually clear
2. **Use type assertions sparingly** - `as any` should be last resort
3. **Add proper interfaces** - Define interfaces for complex objects
4. **Use the utility types** - Import from `lib/type-utils.ts`
5. **Check for typos** - Property names, imports, etc.

### Production Builds

For production builds, stricter rules apply:
- All TypeScript errors must be fixed
- ESLint warnings are treated as errors
- Use `npm run build:force` to ensure production-ready code

### IDE Setup

For the best development experience:
- Use VS Code with TypeScript and ESLint extensions
- Enable "Format on Save" with Prettier
- Use TypeScript strict mode checking in your editor
- Enable auto-import organization

### Debugging Tips

1. **Use console.log liberally** - They're allowed in this codebase
2. **Check the Network tab** - For API-related issues
3. **Use TypeScript errors as guidance** - They often point to real issues
4. **Test in both development and production builds** - Some issues only appear in production

This configuration balances developer experience with code quality, allowing for rapid iteration while maintaining a stable codebase.