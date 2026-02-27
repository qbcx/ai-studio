import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'taskId is required' },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();
    const result = await zai.async.result.query(taskId);

    const response: {
      success: boolean;
      taskId: string;
      status: string;
      videoUrl?: string;
      error?: string;
    } = {
      success: true,
      taskId: taskId,
      status: result.task_status
    };

    if (result.task_status === 'SUCCESS') {
      const videoUrl = result.video_result?.[0]?.url ||
                      (result as { video_url?: string }).video_url ||
                      (result as { url?: string }).url ||
                      (result as { video?: string }).video;

      if (videoUrl) {
        response.videoUrl = videoUrl;
      } else {
        response.success = false;
        response.error = 'Video URL not found in response';
      }
    } else if (result.task_status === 'FAIL') {
      response.success = false;
      response.error = 'Video generation failed';
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Video status check error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
