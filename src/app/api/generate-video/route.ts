export const runtime = 'edge';

import { NextResponse } from 'next/server';

// POST /api/generate-video
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, quality = 'speed', duration = 5 } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Prompt is required'
      }, { status: 400 });
    }

    // Check for API key
    const apiKey = process.env.ZAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'Video generation requires ZAI_API_KEY. Get one at: https://open.bigmodel.cn'
      }, { status: 401 });
    }

    // Zhipu AI CogVideoX API
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/video/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'cogvideox',
        prompt: prompt.trim(),
        video_duration: duration,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        success: false,
        error: `API error: ${response.status}`
      }, { status: response.status });
    }

    const data = await response.json();
    const taskId = data.id || data.task_id || data.data?.id;

    if (!taskId) {
      return NextResponse.json({
        success: false,
        error: 'No task ID returned'
      }, { status: 500 });
    }

    // Return in format expected by frontend
    return NextResponse.json({
      success: true,
      data: {
        taskId
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
