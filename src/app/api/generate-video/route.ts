export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { generateVideoSchema } from '@/features/ai-generator/schemas';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  type ApiResponse
} from '@/lib/api-response';
import { logError, debugLog } from '@/lib/errors';
import type { VideoGenerationResponse } from '@/features/ai-generator/types';

// POST /api/generate-video
// Creates a video generation task from a text prompt
// NOTE: Video generation requires an API key - no free tier available
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

    // Check for API key
    const apiKey = process.env.ZAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'Video generation requires an API key. Get one for free at: https://bigmodel.cn (Zhipu AI) or add ZAI_API_KEY to your environment variables.',
        code: 'API_KEY_REQUIRED'
      }, { status: 401 });
    }

    const { prompt, quality, duration } = parseResult.data;

    debugLog('VideoGen', `[${requestId}] Starting generation`, {
      prompt: prompt.slice(0, 50),
      quality,
      duration
    });

    // Zhipu AI / BigModel API for video generation
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/video/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'cogvideox',
        prompt,
        quality,
        duration,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({
        success: false,
        error: errorData.error?.message || `API error: ${response.status}`,
        code: 'API_ERROR'
      }, { status: response.status });
    }

    const data = await response.json();
    const taskId = data.id || data.task_id || data.data?.id;

    if (!taskId) {
      return NextResponse.json({
        success: false,
        error: 'No task ID returned from AI service',
        code: 'API_ERROR'
      }, { status: 500 });
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
