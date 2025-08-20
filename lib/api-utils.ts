import { NextResponse } from 'next/server'
import { ApiError } from './types'
import { ERROR_MESSAGES } from './config'

// Safe API response creation with consistent error handling
export function createApiResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}

export function createApiError(
  message: string,
  status = 500,
  details?: string,
  code?: string
): NextResponse {
  const error: ApiError = {
    error: message,
    details,
    code
  }
  
  console.error('API Error:', { message, status, details, code })
  
  return NextResponse.json(error, { status })
}

// Common error responses
export const ApiErrors = {
  badRequest: (details?: string) => 
    createApiError(ERROR_MESSAGES.VALIDATION_ERROR, 400, details, 'BAD_REQUEST'),
  
  unauthorized: (details?: string) => 
    createApiError(ERROR_MESSAGES.UNAUTHORIZED_ACCESS, 401, details, 'UNAUTHORIZED'),
  
  notFound: (resource: string) => 
    createApiError(`${resource} not found`, 404, undefined, 'NOT_FOUND'),
  
  validationError: (details: string) => 
    createApiError(ERROR_MESSAGES.VALIDATION_ERROR, 400, details, 'VALIDATION_ERROR'),
  
  databaseError: (details?: string) => 
    createApiError(ERROR_MESSAGES.DATABASE_ERROR, 500, details, 'DATABASE_ERROR'),
  
  internalError: (details?: string) => 
    createApiError(ERROR_MESSAGES.UNKNOWN_ERROR, 500, details, 'INTERNAL_ERROR')
}

// Safe async operation wrapper
export async function safeApiOperation<T>(
  operation: () => Promise<T>,
  errorContext: string
): Promise<{ success: true; data: T } | { success: false; error: NextResponse }> {
  try {
    const data = await operation()
    return { success: true, data }
  } catch (error) {
    console.error(`${errorContext}:`, error)
    
    if (error instanceof Error) {
      return { 
        success: false, 
        error: ApiErrors.internalError(`${errorContext}: ${error.message}`) 
      }
    }
    
    return { 
      success: false, 
      error: ApiErrors.internalError(errorContext) 
    }
  }
}

// Database operation wrapper with specific error handling
export async function safeDatabaseOperation<T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  context: string
): Promise<{ success: true; data: T } | { success: false; error: NextResponse }> {
  try {
    const { data, error } = await operation()
    
    if (error) {
      console.error(`Database error in ${context}:`, error)
      return { 
        success: false, 
        error: ApiErrors.databaseError(`${context}: ${error.message || 'Unknown database error'}`) 
      }
    }
    
    if (!data) {
      return { 
        success: false, 
        error: ApiErrors.notFound(context) 
      }
    }
    
    return { success: true, data }
  } catch (error) {
    console.error(`Exception in ${context}:`, error)
    return { 
      success: false, 
      error: ApiErrors.internalError(`${context}: ${error instanceof Error ? error.message : 'Unknown error'}`) 
    }
  }
}

// Validation wrapper for API inputs
export function withValidation<T, R>(
  validator: (input: unknown) => { success: true; data: T } | { success: false; error: string },
  handler: (validatedData: T) => Promise<R>
) {
  return async (input: unknown): Promise<R | NextResponse> => {
    const validation = validator(input)
    
    if (!validation.success) {
      return ApiErrors.validationError(validation.error)
    }
    
    try {
      return await handler(validation.data)
    } catch (error) {
      console.error('Handler error:', error)
      return ApiErrors.internalError(
        error instanceof Error ? error.message : 'Handler execution failed'
      )
    }
  }
}

// Type-safe query parameter extraction
export function extractQueryParams(
  url: string,
  required: string[] = [],
  optional: string[] = []
): { success: true; params: Record<string, string> } | { success: false; error: NextResponse } {
  try {
    const { searchParams } = new URL(url)
    const params: Record<string, string> = {}
    
    // Check required parameters
    for (const param of required) {
      const value = searchParams.get(param)
      if (!value) {
        return { 
          success: false, 
          error: ApiErrors.badRequest(`Missing required parameter: ${param}`) 
        }
      }
      params[param] = value
    }
    
    // Extract optional parameters
    for (const param of optional) {
      const value = searchParams.get(param)
      if (value) {
        params[param] = value
      }
    }
    
    return { success: true, params }
  } catch (error) {
    return { 
      success: false, 
      error: ApiErrors.badRequest('Invalid URL or query parameters') 
    }
  }
}

// Rate limiting helper (basic implementation)
const requestCounts = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string, 
  maxRequests = 100, 
  windowMs = 60000 // 1 minute
): boolean {
  const now = Date.now()
  const record = requestCounts.get(identifier)
  
  if (!record || now > record.resetTime) {
    requestCounts.set(identifier, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (record.count >= maxRequests) {
    return false
  }
  
  record.count++
  return true
}

// CORS headers helper
export function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}