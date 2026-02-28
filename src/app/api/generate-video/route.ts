export const runtime = 'edge';

import { NextResponse } from 'next/server';

// Supported video providers
const VIDEO_PROVIDERS = {
  zhipu: {
    name: 'Zhipu AI (CogVideoX)',
    endpoint: 'https://open.bigmodel.cn/api/paas/v4/video/generations',
    statusEndpoint: (taskId: string) => `https://open.bigmodel.cn/api/paas/v4/video/generations/${taskId}`,
    requiresKey: true
  },
  stability: {
    name: 'Stability AI',
    endpoint: 'https://api.stability.ai/v2beta/video/generate',
    requiresKey: true
  },
  replicate: {
    name: 'Replicate',
    endpoint: 'https://api.replicate.com/v1/predictions',
    requiresKey: true
  }
};

type VideoProviderKey = keyof typeof VIDEO_PROVIDERS;

// POST /api/generate-video
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, quality = 'speed', duration = 5, provider = 'zhipu', apiKey } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Prompt is required'
      }, { status: 400 });
    }

    // Check for API key
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'Video generation requires an API key. Add one in Settings.',
        requiresKey: true,
        providers: Object.entries(VIDEO_PROVIDERS).map(([id, p]) => ({
          id,
          name: p.name
        }))
      }, { status: 401 });
    }

    const providerConfig = VIDEO_PROVIDERS[provider as VideoProviderKey] || VIDEO_PROVIDERS.zhipu;

    try {
      // Zhipu AI
      if (provider === 'zhipu') {
        const response = await fetch(providerConfig.endpoint, {
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
            error: `Zhipu AI error: ${response.status}. Check your API key.`,
            details: errorText
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

        return NextResponse.json({
          success: true,
          data: { taskId },
          timestamp: new Date().toISOString()
        });
      }

      // Stability AI
      if (provider === 'stability') {
        const response = await fetch(providerConfig.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            text_prompts: [{ text: prompt }],
            cfg_scale: 7,
            motion_bucket_id: 127,
          }),
        });

        if (!response.ok) {
          return NextResponse.json({
            success: false,
            error: `Stability AI error: ${response.status}`
          }, { status: response.status });
        }

        const data = await response.json();
        const taskId = data.id;

        return NextResponse.json({
          success: true,
          data: { taskId },
          timestamp: new Date().toISOString()
        });
      }

      // Default: provider not fully implemented
      return NextResponse.json({
        success: false,
        error: `${providerConfig.name} integration coming soon. Use Zhipu AI.`
      }, { status: 400 });

    } catch (fetchError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to connect to video API. Check your API key and try again.'
      }, { status: 502 });
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
