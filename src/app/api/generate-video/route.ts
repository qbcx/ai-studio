export const runtime = 'edge';

import { NextResponse } from 'next/server';

// Security: Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5; // Lower limit for video (expensive)
const RATE_WINDOW = 60000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT) {
    return false;
  }

  entry.count++;
  return true;
}

// Security: Sanitize prompt
function sanitizePrompt(prompt: string): string {
  return prompt
    .replace(/[<>]/g, '')
    .replace(/[\x00-\x1F]/g, '')
    .slice(0, 1000)
    .trim();
}

// Security: Validate API key
function validateApiKey(provider: string, key: string): boolean {
  if (!key || key.length < 10) return false;
  return true;
}

// POST /api/generate-video
export async function POST(request: Request) {
  try {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown';

    if (!checkRateLimit(clientIp)) {
      return NextResponse.json({
        success: false,
        error: 'Too many requests. Please wait a minute.'
      }, { status: 429 });
    }

    const body = await request.json();
    const { prompt, quality = 'speed', duration = 5, provider = 'zhipu', apiKey } = body;

    // Validate prompt
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Prompt is required'
      }, { status: 400 });
    }

    const cleanPrompt = sanitizePrompt(prompt);

    // Validate API key
    if (!apiKey || !validateApiKey(provider, apiKey)) {
      return NextResponse.json({
        success: false,
        error: 'Valid API key required',
        requiresKey: true
      }, { status: 401 });
    }

    // Validate duration (1-10 seconds)
    const validDuration = Math.min(Math.max(Number(duration) || 5, 1), 10);

    console.log('[VideoGen] Provider:', provider);

    // Zhipu AI CogVideoX
    if (provider === 'zhipu') {
      try {
        const response = await fetch('https://open.bigmodel.cn/api/paas/v4/video/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'cogvideox',
            prompt: cleanPrompt,
            video_duration: validDuration,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `Zhipu AI error: ${response.status}`;

          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
          } catch {
            if (errorText) errorMessage = errorText.slice(0, 200);
          }

          return NextResponse.json({
            success: false,
            error: errorMessage
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

      } catch (fetchError) {
        console.error('[VideoGen] Zhipu fetch error:', fetchError);
        return NextResponse.json({
          success: false,
          error: 'Failed to connect to Zhipu AI. Check your API key.'
        }, { status: 502 });
      }
    }

    // Runway (placeholder - requires different auth)
    if (provider === 'runway') {
      return NextResponse.json({
        success: false,
        error: 'Runway integration requires setup. Please use Zhipu AI for now.'
      }, { status: 400 });
    }

    // Replicate (LTX Video, Kling)
    if (provider === 'replicate') {
      if (!apiKey || !validateApiKey(provider, apiKey)) {
        return NextResponse.json({
          success: false,
          error: 'Valid Replicate API key required. Get it from https://replicate.com/account/api-tokens',
          requiresKey: true
        }, { status: 401 });
      }

      try {
        const response = await fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            version: 'lightricks/ltx-video',
            input: {
              prompt: cleanPrompt,
              duration: validDuration
            }
          })
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          return NextResponse.json({
            success: false,
            error: error.detail || `Replicate error: ${response.status}`
          }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json({
          success: true,
          data: { taskId: data.id, pollUrl: data.urls?.get },
          timestamp: new Date().toISOString()
        });

      } catch (fetchError) {
        console.error('[VideoGen] Replicate fetch error:', fetchError);
        return NextResponse.json({
          success: false,
          error: 'Failed to connect to Replicate. Check your API key.'
        }, { status: 502 });
      }
    }

    // fal.ai (LTX-2)
    if (provider === 'fal') {
      if (!apiKey || !validateApiKey(provider, apiKey)) {
        return NextResponse.json({
          success: false,
          error: 'Valid fal.ai API key required. Get it from https://fal.ai/dashboard/keys',
          requiresKey: true
        }, { status: 401 });
      }

      try {
        const response = await fetch('https://fal.run/fal-ai/ltx-video', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Key ${apiKey}`
          },
          body: JSON.stringify({
            prompt: cleanPrompt,
            duration: validDuration
          })
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          return NextResponse.json({
            success: false,
            error: error.detail || `fal.ai error: ${response.status}`
          }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json({
          success: true,
          data: { taskId: data.request_id, videoUrl: data.video?.url },
          timestamp: new Date().toISOString()
        });

      } catch (fetchError) {
        console.error('[VideoGen] fal.ai fetch error:', fetchError);
        return NextResponse.json({
          success: false,
          error: 'Failed to connect to fal.ai. Check your API key.'
        }, { status: 502 });
      }
    }

    // Kling AI
    if (provider === 'kling') {
      if (!apiKey || !validateApiKey(provider, apiKey)) {
        return NextResponse.json({
          success: false,
          error: 'Valid Kling AI API key required.',
          requiresKey: true
        }, { status: 401 });
      }

      try {
        const response = await fetch('https://api.klingai.com/v1/videos/text2video', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            prompt: cleanPrompt,
            duration: validDuration,
            cfg_scale: 0.5,
            mode: 'std'
          })
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          return NextResponse.json({
            success: false,
            error: error.message || `Kling error: ${response.status}`
          }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json({
          success: true,
          data: { taskId: data.data?.task_id || data.task_id },
          timestamp: new Date().toISOString()
        });

      } catch (fetchError) {
        console.error('[VideoGen] Kling fetch error:', fetchError);
        return NextResponse.json({
          success: false,
          error: 'Failed to connect to Kling AI. Check your API key.'
        }, { status: 502 });
      }
    }

    return NextResponse.json({
      success: false,
      error: `Unknown provider: ${provider}. Supported: zhipu, replicate, fal, kling`
    }, { status: 400 });

  } catch (error) {
    console.error('[VideoGen] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Something went wrong. Please try again.'
    }, { status: 500 });
  }
}
