// Core application types for type safety and consistency

export interface Season {
  id: number
  name: string
  year: number
  is_active: boolean
  is_active_assets: boolean
  created_at: string
  updated_at: string
}

export interface Player {
  id: number
  name: string
  position?: string
  team?: string
  created_at: string
  updated_at: string
}

export interface Manager {
  id: number
  manager_name: string
  email: string
  team_name?: string
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface DraftResult {
  id: number
  player_id: number
  manager_id: number
  season_id: number
  draft_price: number | null
  draft_order?: number
  is_keeper: boolean
  is_topper: boolean
  topper_manager_ids?: number[]
  created_at: string
  // Relations
  players?: Player
  managers?: Manager
  seasons?: Season
}

export interface Roster {
  id: number
  player_id: number
  manager_id: number
  season_id: number
  keeper_cost: number | null
  consecutive_keeps: number | null
  created_at: string
  updated_at: string
  // Relations
  players?: Player | Player[]
  managers?: Manager | Manager[]
  // Calculated fields
  draft_price?: number | null
  is_keeper?: boolean
  trade_count?: number
  calculated_keeper_cost?: number | null
}

export interface Trade {
  id: number
  player_id: number
  season_id: number
  from_manager_id?: number
  to_manager_id?: number
  trade_date: string
  created_at: string
  // Relations
  players?: Player
  seasons?: Season
  from_manager?: Manager
  to_manager?: Manager
}

export interface ManagerAsset {
  id: number
  manager_id: number
  season_id: number
  draft_budget: number
  current_budget: number
  total_spent: number
  roster_count: number
  created_at: string
  updated_at: string
  // Relations
  managers?: Manager
  seasons?: Season
}

export interface LSLEntry {
  id: number
  manager_id: number
  season_id: number
  player_name: string
  position: string
  team: string
  points: number
  created_at: string
  // Relations
  managers?: Manager
  seasons?: Season
}

export interface Topper {
  id: number
  manager_id: number
  season_id: number
  player_name: string
  description: string
  created_at: string
  // Relations
  managers?: Manager
  seasons?: Season
}

// API Response types
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface ApiError {
  error: string
  details?: string
  code?: string
}

// Request/Response specific types
export interface KeeperPriceResponse {
  keeper_price: number | null
  consecutive_keeps: number
  last_draft_price: number | null
  trade_count: number
}

export interface DraftPickRequest {
  player_id: number
  manager_id: number
  season_id: number
  draft_price: number
  is_keeper: boolean
  is_topper: boolean
  topper_manager_ids?: number[]
}

export interface PlayerSearchResponse {
  id: number
  name: string
  position?: string
  team?: string
}

// Configuration types
export interface AppConfig {
  currentSeasonId: number
  draftBudget: number
  rosterSize: number
  keeperEscalation: Record<number, number>
}

// Utility types for better type safety
export type DatabaseRecord = {
  id: number
  created_at: string
  updated_at?: string
}

export type WithRelations<T, R> = T & R

export type SelectFields<T> = Partial<T>

// Form types
export interface LoginForm {
  email: string
  password: string
}

export interface PasswordSetupForm {
  newPassword: string
  confirmPassword: string
}

// State types
export interface AuthState {
  user: any | null // Supabase User type - using any for external library compatibility
  loading: boolean
  isAdmin: boolean
}

export interface LoadingState {
  isLoading: boolean
  error: string | null
}