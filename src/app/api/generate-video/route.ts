export const runtime = 'edge';

import { NextResponse } from 'next/server';

// GET handler for testing
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'generate-video',
    providers: ['zhipu', 'replicate', 'fal', 'kling', 'runway']
  });
}

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
        // Try the standard endpoint format
        const response = await fetch('https://open.bigmodel.cn/api/paas/v4/video/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'cogvideox',
            prompt: cleanPrompt,
          }),
        });

        // Log the response for debugging
        console.log('[VideoGen] Zhipu response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[VideoGen] Zhipu error:', errorText);
          let errorMessage = `Zhipu AI error (${response.status})`;

          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error?.message || errorJson.message || errorJson.error || errorMessage;
          } catch {
            if (errorText) errorMessage = errorText.slice(0, 200);
          }

          // Return 400 with clear error message
          return NextResponse.json({
            success: false,
            error: response.status === 401
              ? 'Invalid Zhipu AI API key. Check your key at open.bigmodel.cn'
              : response.status === 404
                ? 'Zhipu AI video endpoint not found.'
                : response.status === 429
                  ? 'Zhipu AI rate limit exceeded. Please wait.'
                  : errorMessage
          }, { status: 400 });
        }

        const data = await response.json();
        console.log('[VideoGen] Zhipu response:', JSON.stringify(data).slice(0, 500));

        const taskId = data.id || data.task_id || data.data?.id;

        if (!taskId) {
          return NextResponse.json({
            success: false,
            error: 'No task ID returned from Zhipu AI'
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
          error: 'Failed to connect to Zhipu AI. Check your connection.'
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
          let errorMsg = `fal.ai error: ${response.status}`;
          try {
            const error = await response.json();
            errorMsg = error.detail || error.error || errorMsg;
          } catch {}

          // Return 400 instead of passing through 404/402
          return NextResponse.json({
            success: false,
            error: response.status === 404
              ? 'fal.ai video endpoint unavailable. Try again later.'
              : response.status === 401
                ? 'Invalid fal.ai API key'
                : response.status === 402
                  ? 'fal.ai: Insufficient credits'
                  : errorMsg
          }, { status: 400 });
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
          error: 'Failed to connect to fal.ai. Check your connection.'
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
          let errorMsg = `Kling error: ${response.status}`;
          try {
            const error = await response.json();
            errorMsg = error.message || error.error?.message || errorMsg;
          } catch {}

          return NextResponse.json({
            success: false,
            error: response.status === 404
              ? 'Kling AI endpoint unavailable. Try again later.'
              : response.status === 401
                ? 'Invalid Kling AI API key'
                : errorMsg
          }, { status: 400 });
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
          error: 'Failed to connect to Kling AI. Check your connection.'
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
