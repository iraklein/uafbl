// Type utilities to prevent common build errors and provide better DX

// Safely handle Supabase responses that may return errors
export type SupabaseResponse<T> = {
  data: T | null
  error: any | null
}

// Generic API response wrapper
export type ApiResult<T> = {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Utility for making all properties optional (useful for partial updates)
export type PartialUpdate<T> = Partial<T>

// Utility for database records with common fields
export type DbRecord = {
  id: number
  created_at: string
  updated_at?: string
}

// Utility for handling unknown data from external sources
export type UnknownData = Record<string, any>

// Helper type for form state
export type FormState<T> = {
  values: T
  errors: Partial<Record<keyof T, string>>
  isSubmitting: boolean
}

// Helper for API endpoints that might return arrays or single items
export type ApiData<T> = T | T[] | null

// Helper for handling optional relations in Supabase queries
export type WithOptionalRelations<T, R = any> = T & Partial<R>

// Utility for handling state that can be loading
export type AsyncState<T> = {
  data: T | null
  loading: boolean
  error: string | null
}

// Helper for handling search/filter parameters
export type SearchParams = Record<string, string | number | boolean | undefined>

// Helper for handling sort parameters
export type SortConfig = {
  field: string
  direction: 'asc' | 'desc'
}

// Helper for pagination
export type PaginationConfig = {
  page: number
  limit: number
  total?: number
}

// Helper for handling file uploads
export type FileUpload = {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'complete' | 'error'
  error?: string
}

// Helper for handling component props that might have children
export type WithChildren<T = Record<string, never>> = T & {
  children?: React.ReactNode
}

// Helper for handling optional callback functions
export type OptionalCallback<T = void> = ((value: T) => void) | undefined

// Helper for handling component ref props
export type ComponentRef<T = HTMLElement> = React.Ref<T>

// Utility type for making certain fields required
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>

// Utility type for excluding certain fields
export type ExcludeFields<T, K extends keyof T> = Omit<T, K>

// Helper for handling environment variables (always strings or undefined)
export type EnvVar = string | undefined

// Helper for handling JSON data that might be parsed
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray
export type JsonObject = { [key: string]: JsonValue }
export type JsonArray = JsonValue[]