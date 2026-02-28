// Zod Schemas for API Validation
// Provides runtime validation and type inference

import { z } from 'zod'

// Image Generation Schema
export const generateImageSchema = z.object({
  prompt: z
    .string()
    .min(1, 'Prompt is required')
    .max(2000, 'Prompt must be less than 2000 characters')
    .transform(val => val.trim()),
  size: z
    .string()
    .regex(/^\d+x\d+$/, 'Size must be in format "WIDTHxHEIGHT"')
    .default('1024x1024')
})

export type GenerateImageInput = z.infer<typeof generateImageSchema>

// Video Generation Schema
export const generateVideoSchema = z.object({
  prompt: z
    .string()
    .min(1, 'Prompt is required')
    .max(1000, 'Prompt must be less than 1000 characters')
    .transform(val => val.trim()),
  quality: z
    .enum(['speed', 'quality'])
    .default('speed'),
  duration: z
    .number()
    .int()
    .min(5, 'Minimum duration is 5 seconds')
    .max(10, 'Maximum duration is 10 seconds')
    .default(5),
  fps: z
    .number()
    .int()
    .min(24)
    .max(60)
    .default(30)
})

export type GenerateVideoInput = z.infer<typeof generateVideoSchema>

// Video Status Schema
export const videoStatusSchema = z.object({
  taskId: z
    .string()
    .min(1, 'taskId is required')
})

export type VideoStatusInput = z.infer<typeof videoStatusSchema>

// Error Response Schema
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.record(z.unknown()).optional()
})

// Success Response Schema
export const successResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    timestamp: z.string()
  })
