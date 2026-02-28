export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { videoStatusSchema } from '@/features/ai-generator/schemas';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  type ApiResponse
} from '@/lib/api-response';
import { logError, debugLog, createApiError } from '@/lib/errors';
import type { VideoStatusResponse } from '@/features/ai-generator/types';

// GET /api/video-status?taskId=xxx
// Checks the status of a video generation task
export async function GET(request: Request): Promise<NextResponse<ApiResponse<VideoStatusResponse>>> {
  const requestId = crypto.randomUUID().slice(0, 8);

  try {
    const { searchParams } = new URL(request.url);

    // Validate query parameters
    const parseResult = videoStatusSchema.safeParse({
      taskId: searchParams.get('taskId')
    });

    if (!parseResult.success) {
      return validationErrorResponse('taskId parameter is required');
    }

    const { taskId } = parseResult.data;

    // Check for API key
    const apiKey = process.env.ZAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'Video generation requires an API key.',
        code: 'API_KEY_REQUIRED'
      }, { status: 401 });
    }

    debugLog('VideoStatus', `[${requestId}] Checking status for task`, { taskId });

    // Zhipu AI / BigModel API to check video status
    const response = await fetch(`https://open.bigmodel.cn/api/paas/v4/video/generations/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw createApiError(errorData.error?.message || `API error: ${response.status}`, {
        status: response.status,
        error: errorData
      });
    }

    const data = await response.json();
    const status = data.status || data.data?.status || 'PROCESSING';

    debugLog('VideoStatus', `[${requestId}] Status response`, { status, data });

    // Handle different statuses
    if (status === 'SUCCESS' || status === 'completed' || status === 'succeeded') {
      const videoUrl = data.video || data.video_url || data.data?.video || data.data?.video_url;

      if (!videoUrl) {
        throw createApiError('Video completed but no URL returned', {
          taskId,
          status
        });
      }

      return successResponse({
        status: 'SUCCESS',
        videoUrl
      });
    }

    if (status === 'FAIL' || status === 'failed' || status === 'error') {
      return successResponse({
        status: 'FAIL'
      });
    }

    // Still processing
    return successResponse({
      status: 'PROCESSING'
    });

  } catch (error) {
    logError('VideoStatus', error);
    return errorResponse(error, 'Failed to check video status');
  }
}
