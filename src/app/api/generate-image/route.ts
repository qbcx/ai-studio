export const runtime = 'edge';

import { NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { generateImageSchema } from '@/features/ai-generator/schemas';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  type ApiResponse
} from '@/lib/api-response';
import {
  logError,
  debugLog,
  createApiError,
  createValidationError
} from '@/lib/errors';
import type { ImageGenerationResponse } from '@/features/ai-generator/types';

// POST /api/generate-image
// Generates an AI image from a text prompt
export async function POST(request: Request): Promise<NextResponse<ApiResponse<ImageGenerationResponse>>> {
  const requestId = crypto.randomUUID().slice(0, 8);

  try {
    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
      debugLog('ImageGen', `[${requestId}] Request received`, body);
    } catch {
      return validationErrorResponse('Invalid JSON in request body');
    }

    // Validate with Zod schema
    const parseResult = generateImageSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors.map(e => e.message).join(', ');
      debugLog('ImageGen', `[${requestId}] Validation failed`, parseResult.error.errors);
      return validationErrorResponse(errorMessage, {
        fields: parseResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }

    const { prompt, size } = parseResult.data;

    debugLog('ImageGen', `[${requestId}] Starting generation`, { prompt: prompt.slice(0, 50), size });

    // Initialize AI SDK
    const zai = await ZAI.create();

    // Generate image
    const response = await zai.images.generations.create({
      prompt,
      size,
    });

    const imageBase64 = response.data[0]?.base64;

    if (!imageBase64) {
      throw createApiError('No image data returned from AI service', {
        response: 'missing base64 data'
      });
    }

    debugLog('ImageGen', `[${requestId}] Generation successful`);

    return successResponse({
      image: imageBase64,
      prompt,
      size,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logError(`ImageGen [${requestId}]`, error);
    return errorResponse(error, 'Failed to generate image');
  }
}
