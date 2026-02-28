export const runtime = 'edge';

import { NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { generateVideoSchema } from '@/features/ai-generator/schemas';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  type ApiResponse
} from '@/lib/api-response';
import {
  logError,
  debugLog,
  createApiError
} from '@/lib/errors';
import type { VideoGenerationResponse } from '@/features/ai-generator/types';

// POST /api/generate-video
// Creates a video generation task from a text prompt
export async function POST(request: Request): Promise<NextResponse<ApiResponse<VideoGenerationResponse>>> {
  const requestId = crypto.randomUUID().slice(0, 8);

  try {
    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
      debugLog('VideoGen', `[${requestId}] Request received`, body);
    } catch {
      return validationErrorResponse('Invalid JSON in request body');
    }

    // Validate with Zod schema
    const parseResult = generateVideoSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors.map(e => e.message).join(', ');
      debugLog('VideoGen', `[${requestId}] Validation failed`, parseResult.error.errors);
      return validationErrorResponse(errorMessage, {
        fields: parseResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }

    const { prompt, quality, duration, fps } = parseResult.data;

    debugLog('VideoGen', `[${requestId}] Starting generation`, {
      prompt: prompt.slice(0, 50),
      quality,
      duration,
      fps
    });

    // Initialize AI SDK
    const zai = await ZAI.create();

    // Create video generation task
    const response = await zai.videos.generations.create({
      prompt,
      quality,
      duration,
      // Note: fps might not be supported by the SDK, keeping for compatibility
    });

    const taskId = response.id;

    if (!taskId) {
      throw createApiError('No task ID returned from AI service', {
        response: 'missing task id'
      });
    }

    debugLog('VideoGen', `[${requestId}] Task created`, { taskId });

    return successResponse({
      taskId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logError(`VideoGen [${requestId}]`, error);
    return errorResponse(error, 'Failed to create video task');
  }
}
