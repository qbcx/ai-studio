export const runtime = 'edge';

import { NextResponse } from 'next/server';

// GET /api/video-status?taskId=xxx
export async function GET(request: Request) {
  const requestId = crypto.randomUUID().slice(0, 8);

  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({
        success: false,
        error: 'taskId is required'
      }, { status: 400 });
    }

    // Check for API key
    const apiKey = process.env.ZAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'API key required'
      }, { status: 401 });
    }

    console.log(`[${requestId}] Checking video status:`, taskId);

    const response = await fetch(`https://open.bigmodel.cn/api/paas/v4/video/generations/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${requestId}] Status check error:`, errorText);
      return NextResponse.json({
        success: false,
        error: `API error: ${response.status}`
      }, { status: response.status });
    }

    const data = await response.json();
    console.log(`[${requestId}] Status response:`, data);

    const status = data.status || data.task_status || 'PROCESSING';

    if (status === 'SUCCESS' || status === 'completed' || status === 'succeeded') {
      const videoUrl = data.video_url || data.video || data.data?.video_url;
      return NextResponse.json({
        success: true,
        data: {
          status: 'SUCCESS',
          videoUrl
        }
      });
    }

    if (status === 'FAIL' || status === 'failed') {
      return NextResponse.json({
        success: true,
        data: {
          status: 'FAIL'
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        status: 'PROCESSING'
      }
    });

  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
