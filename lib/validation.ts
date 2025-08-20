import { z } from 'zod'

// Base validation schemas
export const IdSchema = z.number().int().positive()
export const EmailSchema = z.string().email()
export const NonEmptyStringSchema = z.string().min(1).trim()
export const OptionalStringSchema = z.string().optional().nullable()
export const DateStringSchema = z.string().datetime()
export const PositiveNumberSchema = z.number().min(0)
export const DraftPriceSchema = z.number().min(0).max(1000) // Reasonable draft price range

// API Request validation schemas
export const DraftPickSchema = z.object({
  player_id: IdSchema,
  manager_id: IdSchema,
  season_id: IdSchema,
  draft_price: DraftPriceSchema,
  is_keeper: z.boolean(),
  is_topper: z.boolean(),
  topper_manager_ids: z.array(IdSchema).optional()
})

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(6)
})

export const PasswordSetupSchema = z.object({
  newPassword: z.string().min(6),
  confirmPassword: z.string().min(6)
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export const TradeSchema = z.object({
  player_id: IdSchema,
  season_id: IdSchema,
  from_manager_id: IdSchema.optional(),
  to_manager_id: IdSchema.optional(),
  trade_date: DateStringSchema
})

export const SeasonSchema = z.object({
  name: NonEmptyStringSchema,
  year: z.number().int().min(2020).max(2050),
  is_active: z.boolean()
})

export const PlayerSearchSchema = z.object({
  query: z.string().min(2).max(100),
  limit: z.number().int().min(1).max(50).optional().default(10)
})

// Query parameter validation
export const IdParamSchema = z.object({
  id: z.string().transform((val) => {
    const num = parseInt(val, 10)
    if (isNaN(num) || num <= 0) {
      throw new Error('Invalid ID parameter')
    }
    return num
  })
})

export const SeasonIdQuerySchema = z.object({
  season_id: z.string().transform((val) => {
    const num = parseInt(val, 10)
    if (isNaN(num) || num <= 0) {
      throw new Error('Invalid season_id parameter')
    }
    return num
  })
})

export const PlayerIdQuerySchema = z.object({
  player_id: z.string().transform((val) => {
    const num = parseInt(val, 10)
    if (isNaN(num) || num <= 0) {
      throw new Error('Invalid player_id parameter')
    }
    return num
  })
})

export const KeeperPriceQuerySchema = z.object({
  player_id: z.string().transform((val) => {
    const num = parseInt(val, 10)
    if (isNaN(num) || num <= 0) {
      throw new Error('Invalid player_id parameter')
    }
    return num
  }),
  season_id: z.string().transform((val) => {
    const num = parseInt(val, 10)
    if (isNaN(num) || num <= 0) {
      throw new Error('Invalid season_id parameter')
    }
    return num
  })
})

// Response validation schemas
export const PlayerSchema = z.object({
  id: IdSchema,
  name: NonEmptyStringSchema,
  position: OptionalStringSchema,
  team: OptionalStringSchema,
  created_at: DateStringSchema,
  updated_at: DateStringSchema.optional()
})

export const ManagerSchema = z.object({
  id: IdSchema,
  manager_name: NonEmptyStringSchema,
  email: EmailSchema,
  team_name: OptionalStringSchema,
  is_admin: z.boolean(),
  created_at: DateStringSchema,
  updated_at: DateStringSchema.optional()
})

export const SeasonResponseSchema = z.object({
  id: IdSchema,
  name: NonEmptyStringSchema,
  year: z.number().int(),
  is_active: z.boolean(),
  created_at: DateStringSchema,
  updated_at: DateStringSchema.optional()
})

// Error response schema
export const ApiErrorSchema = z.object({
  error: NonEmptyStringSchema,
  details: OptionalStringSchema,
  code: OptionalStringSchema
})

// Utility function for safe API validation
export function validateApiInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return { success: false, error: `Validation error: ${errorMessage}` }
    }
    return { success: false, error: 'Unknown validation error' }
  }
}

// Utility function for safe query parameter parsing
export function parseQueryParams<T>(schema: z.ZodSchema<T>, params: URLSearchParams): { success: true; data: T } | { success: false; error: string } {
  try {
    const data = Object.fromEntries(params.entries())
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return { success: false, error: `Query parameter error: ${errorMessage}` }
    }
    return { success: false, error: 'Unknown query parameter error' }
  }
}