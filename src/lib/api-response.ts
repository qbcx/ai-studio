// API Response Utilities
// Provides consistent response formatting for API routes

import { NextResponse } from 'next/server'
import { ApplicationError, classifyError, getSafeErrorMessage } from './errors'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: string
  timestamp: string
}

// Success response helper
export function successResponse<T>(data: T, status: number = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    timestamp: new Date().toISOString()
  }, { status })
}

// Error response helper
export function errorResponse(
  error: unknown,
  defaultMessage: string = 'An error occurred'
): NextResponse<ApiResponse> {
  const appError = error instanceof ApplicationError
    ? error
    : classifyError(error)

  // Log the full error for debugging
  console.error('[API Error]', {
    message: appError.message,
    code: appError.code,
    statusCode: appError.statusCode,
    details: appError.details,
    stack: appError.stack
  })

  return NextResponse.json({
    success: false,
    error: getSafeErrorMessage(error) || defaultMessage,
    code: appError.code,
    timestamp: new Date().toISOString()
  }, { status: appError.statusCode })
}

// Validation error response helper
export function validationErrorResponse(
  message: string,
  details?: Record<string, unknown>
): NextResponse<ApiResponse> {
  return NextResponse.json({
    success: false,
    error: message,
    code: 'VALIDATION_ERROR',
    timestamp: new Date().toISOString(),
    details
  }, { status: 400 })
}

// Async handler wrapper with error handling
export function withErrorHandler<T>(
  handler: () => Promise<NextResponse<ApiResponse<T>>>
): Promise<NextResponse<ApiResponse<T>>> {
  return handler().catch(error => errorResponse(error))
}
