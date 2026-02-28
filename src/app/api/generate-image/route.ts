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
    const [width, height] = size.split('x').map(Number);

    debugLog('ImageGen', `[${requestId}] Starting generation`, { prompt: prompt.slice(0, 50), size });

    // Try multiple APIs for better reliability
    const apis = [
      // Option 1: Pollinations with specific model
      {
        url: `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&seed=${Date.now()}&model=flux&enhance=true`,
        method: 'GET',
      },
      // Option 2: Pollinations with turbo model (faster)
      {
        url: `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&seed=${Date.now()}&model=turbo`,
        method: 'GET',
      },
    ];

    let lastError: Error | null = null;

    for (const api of apis) {
      try {
        debugLog('ImageGen', `[${requestId}] Trying API`, api.url.substring(0, 100));

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout

        const response = await fetch(api.url, {
          method: api.method,
          signal: controller.signal,
          headers: {
            'Accept': 'image/*',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          debugLog('ImageGen', `[${requestId}] API failed`, { status: response.status });
          lastError = new Error(`API returned ${response.status}`);
          continue; // Try next API
        }

        const imageBuffer = await response.arrayBuffer();

        if (imageBuffer.byteLength < 1000) {
          debugLog('ImageGen', `[${requestId}] Image too small`, { size: imageBuffer.byteLength });
          lastError = new Error('Image too small');
          continue; // Try next API
        }

        const imageBase64 = arrayBufferToBase64(imageBuffer);

        debugLog('ImageGen', `[${requestId}] Generation successful`, { size: imageBuffer.byteLength });

        return successResponse({
          image: `data:image/png;base64,${imageBase64}`,
          prompt,
          size,
          timestamp: new Date().toISOString()
        });

      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Unknown error');
        debugLog('ImageGen', `[${requestId}] API error`, lastError.message);
        continue; // Try next API
      }
    }

    // All APIs failed - return the URL so client can try directly
    const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&seed=${Date.now()}`;

    debugLog('ImageGen', `[${requestId}] All APIs failed, returning fallback URL`);

    return NextResponse.json({
      success: true,
      data: {
        image: fallbackUrl, // Return URL instead of base64
        prompt,
        size,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logError(`ImageGen [${requestId}]`, error);
    return errorResponse(error, 'Failed to generate image');
  }
}
