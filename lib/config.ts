// Application configuration constants
// This centralizes all hardcoded values to prevent fragility

export const APP_CONFIG = {
  // Season configuration
  CURRENT_SEASON_ID: 1, // 2025-26 season
  PREVIOUS_SEASON_ID: 19, // 2024-25 season
  
  // Draft and budget configuration
  DEFAULT_DRAFT_BUDGET: 200,
  MAX_DRAFT_PRICE: 1000,
  MIN_DRAFT_PRICE: 1,
  MAX_ROSTER_SIZE: 16,
  
  // Keeper cost configuration
  KEEPER_ESCALATION: {
    0: 10,  // First time kept
    1: 15,  // Second consecutive year
    2: 15,  // Third consecutive year
    3: 25,  // Fourth consecutive year
    4: 30,  // Fifth consecutive year
    5: 35,  // Sixth consecutive year
    6: 40,  // Seventh consecutive year
    7: 45,  // Eighth consecutive year
    8: 50,  // Ninth consecutive year
    9: 55,  // Tenth consecutive year
    10: 60  // Eleventh+ consecutive year (cap)
  },
  
  // Trade configuration
  TRADE_COST_PER_TRADE: 5,
  MAX_CONSECUTIVE_KEEPS: 10,
  
  // Authentication configuration
  AUTH_TIMEOUT_MS: 3000,
  PASSWORD_MIN_LENGTH: 6,
  
  // API configuration
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
  API_TIMEOUT_MS: 10000,
  
  // Cache configuration
  SEASONS_CACHE_DURATION_MS: 5 * 60 * 1000, // 5 minutes
  ASSETS_CACHE_DURATION_MS: 2 * 60 * 1000,  // 2 minutes
  
  // Search configuration
  MIN_SEARCH_QUERY_LENGTH: 2,
  MAX_SEARCH_QUERY_LENGTH: 100,
  DEFAULT_SEARCH_LIMIT: 10,
  MAX_SEARCH_LIMIT: 50,
  
  // UI configuration
  LOADING_DELAY_MS: 100,
  ERROR_DISPLAY_DURATION_MS: 5000,
  SUCCESS_MESSAGE_DURATION_MS: 3000
} as const

// Environment configuration with validation
export const ENV_CONFIG = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qjhrwwxvwqwmsjvelgrv.supabase.co',
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqaHJ3d3h2d3F3bXNqdmVsZ3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NTQ0MTcsImV4cCI6MjA3MTEzMDQxN30.0S2GIKB8u8Eqe9cnGZYRvofc271J5tiynJ4AmzABZf4',
  NODE_ENV: process.env.NODE_ENV || 'development'
} as const

// Type-safe configuration getter
export function getConfig<K extends keyof typeof APP_CONFIG>(key: K): typeof APP_CONFIG[K] {
  return APP_CONFIG[key]
}

// Season helper functions
export function getPreviousSeasonId(currentSeasonId: number): number {
  // Handle the special case where season 1 (2025-26) maps to season 19 (2024-25)
  if (currentSeasonId === 1) {
    return 19
  }
  return currentSeasonId - 1
}

export function getNextSeasonId(currentSeasonId: number): number {
  return currentSeasonId + 1
}

// Validation helpers
export function isValidSeasonId(seasonId: number): boolean {
  return Number.isInteger(seasonId) && seasonId > 0
}

export function isValidDraftPrice(price: number): boolean {
  return Number.isFinite(price) && price >= APP_CONFIG.MIN_DRAFT_PRICE && price <= APP_CONFIG.MAX_DRAFT_PRICE
}

export function isValidKeeperEscalation(consecutiveKeeps: number): boolean {
  return Number.isInteger(consecutiveKeeps) && consecutiveKeeps >= 0 && consecutiveKeeps <= APP_CONFIG.MAX_CONSECUTIVE_KEEPS
}

// Error messages
export const ERROR_MESSAGES = {
  INVALID_SEASON_ID: 'Invalid season ID provided',
  INVALID_PLAYER_ID: 'Invalid player ID provided',
  INVALID_MANAGER_ID: 'Invalid manager ID provided',
  INVALID_DRAFT_PRICE: `Draft price must be between $${APP_CONFIG.MIN_DRAFT_PRICE} and $${APP_CONFIG.MAX_DRAFT_PRICE}`,
  INVALID_KEEPER_ESCALATION: `Consecutive keeps must be between 0 and ${APP_CONFIG.MAX_CONSECUTIVE_KEEPS}`,
  MISSING_REQUIRED_FIELD: 'Required field is missing',
  UNAUTHORIZED_ACCESS: 'Unauthorized access - admin privileges required',
  SEASON_NOT_FOUND: 'Season not found',
  PLAYER_NOT_FOUND: 'Player not found',
  MANAGER_NOT_FOUND: 'Manager not found',
  DATABASE_ERROR: 'Database operation failed',
  VALIDATION_ERROR: 'Input validation failed',
  AUTHENTICATION_ERROR: 'Authentication failed',
  NETWORK_ERROR: 'Network request failed',
  UNKNOWN_ERROR: 'An unexpected error occurred'
} as const

// Success messages
export const SUCCESS_MESSAGES = {
  DRAFT_PICK_CREATED: 'Draft pick created successfully',
  TRADE_RECORDED: 'Trade recorded successfully',
  SEASON_CREATED: 'Season created successfully',
  PLAYER_UPDATED: 'Player updated successfully',
  SETTINGS_SAVED: 'Settings saved successfully',
  PASSWORD_UPDATED: 'Password updated successfully',
  LOGOUT_SUCCESS: 'Signed out successfully'
} as const