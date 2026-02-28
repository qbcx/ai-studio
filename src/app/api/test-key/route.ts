// Cloudflare Pages handles this automatically
// export const runtime = 'edge';

import { NextResponse } from 'next/server';

// Security: Rate limiting for test endpoint
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5;
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

// POST /api/test-key
export async function POST(request: Request) {
  try {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown';

    if (!checkRateLimit(clientIp)) {
      return NextResponse.json({
        success: false,
        error: 'Too many test attempts. Please wait a minute.'
      }, { status: 429 });
    }

    const body = await request.json();
    const { provider, apiKey } = body;

    // Validate API key format
    if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 10) {
      return NextResponse.json({
        success: false,
        error: 'Invalid API key format'
      }, { status: 400 });
    }

    // Never log or expose the API key

    switch (provider) {
      case 'zhipu': {
        const res = await fetch('https://open.bigmodel.cn/api/paas/v4/models', {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        });

        if (res.ok) {
          return NextResponse.json({ success: true });
        } else {
          return NextResponse.json({
            success: false,
            error: 'Invalid Zhipu AI API key'
          }, { status: 401 });
        }
      }

      case 'openai': {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        });

        if (res.ok) {
          return NextResponse.json({ success: true });
        } else {
          const data = await res.json().catch(() => ({}));
          return NextResponse.json({
            success: false,
            error: data.error?.message || 'Invalid API key'
          }, { status: 401 });
        }
      }

      case 'stability': {
        const res = await fetch('https://api.stability.ai/v1/user/account', {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        });

        if (res.ok) {
          return NextResponse.json({ success: true });
        } else {
          return NextResponse.json({
            success: false,
            error: 'Invalid Stability AI API key'
          }, { status: 401 });
        }
      }

      case 'replicate': {
        const res = await fetch('https://api.replicate.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        });

        if (res.ok) {
          return NextResponse.json({ success: true });
        } else {
          return NextResponse.json({
            success: false,
            error: 'Invalid Replicate API key'
          }, { status: 401 });
        }
      }

      case 'fal': {
        // fal.ai doesn't have a dedicated validation endpoint, test with a simple request
        const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
          method: 'POST',
          headers: {
            'Authorization': `Key ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt: 'test',
            num_inference_steps: 1
          })
        });

        // Even a 4xx with proper auth response means the key is valid format
        if (res.status !== 401 && res.status !== 403) {
          return NextResponse.json({ success: true });
        } else {
          return NextResponse.json({
            success: false,
            error: 'Invalid fal.ai API key'
          }, { status: 401 });
        }
      }

      case 'gemini': {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

        if (res.ok) {
          return NextResponse.json({ success: true });
        } else {
          return NextResponse.json({
            success: false,
            error: 'Invalid Gemini API key'
          }, { status: 401 });
        }
      }

      case 'kling': {
        // Kling AI - test by checking API availability
        // Note: Kling API may not have a validation endpoint
        return NextResponse.json({
          success: true,
          message: 'Kling AI - key format accepted (validation not available)'
        });
      }

      case 'runway': {
        // Runway doesn't have a simple validation endpoint
        return NextResponse.json({
          success: true,
          message: 'Runway - key format accepted (validation not available)'
        });
      }

      default:
        // For unknown providers, just accept the key format
        return NextResponse.json({
          success: true,
          message: 'Key format accepted'
        });
    }

  } catch (error) {
    console.error('[TestKey] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to test API key. Check your connection.'
    }, { status: 500 });
  }
}
