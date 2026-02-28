// Error Handling Utilities
// Provides consistent error handling across the application

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'API_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'INTERNAL_ERROR'
  | 'UNKNOWN_ERROR'

export interface AppError {
  message: string
  code: ErrorCode
  statusCode: number
  details?: Record<string, unknown>
  stack?: string
}

export class ApplicationError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly details?: Record<string, unknown>

  constructor(
    message: string,
    code: ErrorCode = 'UNKNOWN_ERROR',
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ApplicationError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }

  toJSON() {
    return {
      success: false,
      error: this.message,
      code: this.code,
      details: this.details
    }
  }
}

// Error factory functions
export const createValidationError = (message: string, details?: Record<string, unknown>) =>
  new ApplicationError(message, 'VALIDATION_ERROR', 400, details)

export const createApiError = (message: string, details?: Record<string, unknown>) =>
  new ApplicationError(message, 'API_ERROR', 502, details)

export const createNetworkError = (message: string = 'Network request failed') =>
  new ApplicationError(message, 'NETWORK_ERROR', 503)

export const createTimeoutError = (message: string = 'Request timed out') =>
  new ApplicationError(message, 'TIMEOUT_ERROR', 504)

export const createRateLimitError = (retryAfter?: number) =>
  new ApplicationError(
    'Too many requests. Please try again later.',
    'RATE_LIMIT_ERROR',
    429,
    retryAfter ? { retryAfter } : undefined
  )

export const createInternalError = (message: string = 'Internal server error', details?: Record<string, unknown>) =>
  new ApplicationError(message, 'INTERNAL_ERROR', 500, details)

// Error classification helper
export function classifyError(error: unknown): ApplicationError {
  if (error instanceof ApplicationError) {
    return error
  }

  if (error instanceof Error) {
    // Check for specific error types
    if (error.name === 'AbortError') {
      return createTimeoutError()
    }

    if (error.message.includes('fetch')) {
      return createNetworkError(error.message)
    }

    return createInternalError(error.message, {
      originalError: error.name,
      stack: error.stack
    })
  }

  return createInternalError('An unexpected error occurred')
}

// Safe error message extraction for client display
export function getSafeErrorMessage(error: unknown): string {
  if (error instanceof ApplicationError) {
    return error.message
  }

  if (error instanceof Error) {
    // Don't expose internal error details
    if (error.message.includes('API key') || error.message.includes('secret')) {
      return 'A configuration error occurred. Please contact support.'
    }
    return error.message
  }

  return 'An unexpected error occurred. Please try again.'
}

// Debug logger (only in development)
export function debugLog(category: string, message: string, data?: unknown) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${category}] ${message}`, data !== undefined ? data : '')
  }
}

// Error logger
export function logError(context: string, error: unknown) {
  const timestamp = new Date().toISOString()

  if (error instanceof ApplicationError) {
    console.error(`[${timestamp}] [${context}]`, {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details
    })
  } else if (error instanceof Error) {
    console.error(`[${timestamp}] [${context}]`, {
      message: error.message,
      stack: error.stack
    })
  } else {
    console.error(`[${timestamp}] [${context}] Unknown error:`, error)
  }
}
