export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { generateVideoSchema } from '@/features/ai-generator/schemas';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  type ApiResponse
} from '@/lib/api-response';
import { logError, debugLog, createApiError } from '@/lib/errors';
import type { VideoGenerationResponse } from '@/features/ai-generator/types';

// Z.AI API configuration
const ZAI_API_BASE = 'https://api.zukijourney.com/v1';

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

    const { prompt, quality, duration } = parseResult.data;

    debugLog('VideoGen', `[${requestId}] Starting generation`, {
      prompt: prompt.slice(0, 50),
      quality,
      duration
    });

    // Direct API call to Z.AI for video generation
    const response = await fetch(`${ZAI_API_BASE}/video/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ZAI_API_KEY || ''}`,
      },
      body: JSON.stringify({
        model: 'kling',
        prompt,
        quality,
        duration,
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
    const taskId = data.id || data.task_id || data.data?.id;

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
