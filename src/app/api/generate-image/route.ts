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

// Pollinations.ai - Free API, no key required
const POLLINATIONS_API = 'https://image.pollinations.ai/prompt';

// POST /api/generate-image
// Generates an AI image from a text prompt using Pollinations.ai (FREE)
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
    const [width, height] = size.split('x').map(Number);

    debugLog('ImageGen', `[${requestId}] Starting generation`, { prompt: prompt.slice(0, 50), size });

    // Build Pollinations URL with parameters
    const encodedPrompt = encodeURIComponent(prompt);
    const imageUrl = `${POLLINATIONS_API}/${encodedPrompt}?width=${width}&height=${height}&nologo=true&seed=${Date.now()}`;

    // Fetch the generated image
    const response = await fetch(imageUrl, {
      method: 'GET',
    });

    if (!response.ok) {
      throw createApiError(`Failed to generate image: ${response.status}`, {
        status: response.status
      });
    }

    // Convert image to base64
    const imageBuffer = await response.arrayBuffer();
    const imageBase64 = btoa(
      new Uint8Array(imageBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

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
