// Shared TypeScript interfaces for the UAFBL application

export interface Season {
  id: number
  year: number
  name: string
  is_active?: boolean
}

export interface Player {
  id: number
  name: string
}

export interface Manager {
  id: number
  manager_name: string
  team_name?: string
  active?: boolean
  is_admin?: boolean
  email?: string
}

export interface DraftResult {
  id: number
  draft_price: number | null
  is_keeper: boolean
  is_topper: boolean
  consecutive_keeps: number | null
  players: Player
  managers: Manager
  seasons: Season
}

export interface TopperRecord {
  id: number
  manager_id: number
  player_id: number
  season_id: number
  is_winner: boolean
  is_unused: boolean
  managers: {
    manager_name: string
  }
  players: {
    name: string
  }
  seasons: {
    year: number
    name: string
  }
}

export interface Trade {
  id: number
  player_id: number
  created_at: string
  players: Player
}

export interface LSLRecord {
  id: number
  draft_order: number
  year: number
  draft_price: number
  status: 'Kept' | 'Unkept'
  player_id: number
  original_manager_id: number
  draft_manager_id: number
  players: {
    name: string
  }
  original_managers: {
    manager_name: string
  } | null
  draft_managers: {
    manager_name: string
  } | null
}

export interface Roster {
  id: number
  keeper_cost: number | null
  consecutive_keeps: number | null
  trades: number
  draft_price: number | null
  is_keeper: boolean
  trade_count: number
  calculated_keeper_cost: number | null
  players: Player
  managers: Manager
}

export interface ManagerAsset {
  id: number
  manager_id: number
  season_id: number
  starting_cash: number
  starting_slots: number
  spent_cash: number
  spent_slots: number
  trades_cash: number
  trades_slots: number
  change_history?: any
  managers: Manager
  seasons: Season
}