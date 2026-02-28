export const runtime = 'edge';

import { NextResponse } from 'next/server';

// Security: Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 30;
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

// GET /api/video-status?taskId=xxx&provider=xxx
export async function GET(request: Request) {
  try {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown';

    if (!checkRateLimit(clientIp)) {
      return NextResponse.json({
        success: false,
        error: 'Too many requests'
      }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const provider = searchParams.get('provider') || 'zhipu';

    // Validate taskId
    if (!taskId || !/^[a-zA-Z0-9_-]+$/.test(taskId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid taskId'
      }, { status: 400 });
    }

    // Get API key from header
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'API key required',
        requiresKey: true
      }, { status: 401 });
    }

    console.log('[VideoStatus] Checking:', taskId);

    // Handle different providers
    if (provider === 'zhipu') {
      const response = await fetch(`https://open.bigmodel.cn/api/paas/v4/video/generations/${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        return NextResponse.json({
          success: false,
          error: `API error: ${response.status}`
        }, { status: response.status });
      }

      const data = await response.json();
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
    }

    // Default for unsupported providers
    return NextResponse.json({
      success: false,
      error: `Provider ${provider} not supported for video status`
    }, { status: 400 });

  } catch (error) {
    console.error('[VideoStatus] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check video status'
    }, { status: 500 });
  }
}
