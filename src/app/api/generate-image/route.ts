export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { generateImageSchema } from '@/features/ai-generator/schemas';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  type ApiResponse
} from '@/lib/api-response';
import { logError, debugLog, createApiError } from '@/lib/errors';
import type { ImageGenerationResponse } from '@/features/ai-generator/types';

// Z.AI API configuration
const ZAI_API_BASE = 'https://api.zukijourney.com/v1';

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

    // Direct API call to Z.AI
    const response = await fetch(`${ZAI_API_BASE}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ZAI_API_KEY || ''}`,
      },
      body: JSON.stringify({
        model: 'flux',
        prompt,
        size,
        response_format: 'b64_json',
        n: 1,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw createApiError(errorData.error?.message || `API error: ${response.status}`, {
        status: response.status,
        error: errorData
      });
    }

    const data = await response.json();
    const imageBase64 = data.data?.[0]?.b64_json;

    if (!imageBase64) {
      throw createApiError('No image data returned from AI service', {
        response: 'missing base64 data'
      });
    }

    debugLog('ImageGen', `[${requestId}] Generation successful`);

    return successResponse({
      image: `data:image/png;base64,${imageBase64}`,
      prompt,
      size,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logError(`ImageGen [${requestId}]`, error);
    return errorResponse(error, 'Failed to generate image');
  }
}
