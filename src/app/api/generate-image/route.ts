export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { generateImageSchema } from '@/features/ai-generator/schemas';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  type ApiResponse
} from '@/lib/api-response';
import { logError, debugLog } from '@/lib/errors';
import type { ImageGenerationResponse } from '@/features/ai-generator/types';

// Pollinations.ai - Free API, no key required
const POLLINATIONS_API = 'https://image.pollinations.ai/prompt';

// Helper to convert ArrayBuffer to base64 (Edge runtime compatible)
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

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
    const seed = Math.floor(Math.random() * 1000000);
    const imageUrl = `${POLLINATIONS_API}/${encodedPrompt}?width=${width}&height=${height}&nologo=true&seed=${seed}&model=flux`;

    debugLog('ImageGen', `[${requestId}] Fetching from URL`, imageUrl);

    // Fetch the generated image with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    try {
      const response = await fetch(imageUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AI-Studio/1.0)',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        debugLog('ImageGen', `[${requestId}] API error`, { status: response.status, error: errorText });
        return NextResponse.json({
          success: false,
          error: `Image generation failed (${response.status}). Please try again.`,
          code: 'API_ERROR'
        }, { status: 502 });
      }

      // Convert image to base64
      const imageBuffer = await response.arrayBuffer();
      debugLog('ImageGen', `[${requestId}] Image buffer size`, imageBuffer.byteLength);

      if (imageBuffer.byteLength === 0) {
        return NextResponse.json({
          success: false,
          error: 'Empty image received. Please try again.',
          code: 'EMPTY_RESPONSE'
        }, { status: 502 });
      }

      const imageBase64 = arrayBufferToBase64(imageBuffer);

      debugLog('ImageGen', `[${requestId}] Generation successful`);

      return successResponse({
        image: `data:image/png;base64,${imageBase64}`,
        prompt,
        size,
        timestamp: new Date().toISOString()
      });

    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json({
          success: false,
          error: 'Image generation timed out. Please try again.',
          code: 'TIMEOUT'
        }, { status: 504 });
      }
      throw fetchError;
    }

  } catch (error) {
    logError(`ImageGen [${requestId}]`, error);
    return errorResponse(error, 'Failed to generate image');
  }
}
