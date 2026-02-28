// Note: Using Node.js runtime due to z-ai-web-dev-sdk dependencies
// export const runtime = 'edge';

import { NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { videoStatusSchema } from '@/features/ai-generator/schemas';
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

    debugLog('VideoStatus', `[${requestId}] Checking status for task`, { taskId });

    // Initialize AI SDK
    const zai = await ZAI.create();

    // Get video status
    const response = await zai.videos.generations.status(taskId);

    debugLog('VideoStatus', `[${requestId}] Status response`, {
      status: response.status,
      hasVideo: !!response.video
    });

    // Handle different statuses
    if (response.status === 'SUCCESS') {
      const videoUrl = response.video;

      if (!videoUrl) {
        throw createApiError('Video completed but no URL returned', {
          taskId,
          status: response.status
        });
      }

      return successResponse({
        status: 'SUCCESS',
        videoUrl
      });
    }

    if (response.status === 'FAIL') {
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
