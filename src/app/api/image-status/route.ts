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

// GET /api/image-status?predictionId=xxx
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
    const predictionId = searchParams.get('predictionId');

    // Validate predictionId
    if (!predictionId || !/^[a-zA-Z0-9_-]+$/.test(predictionId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid predictionId'
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

    console.log('[ImageStatus] Checking:', predictionId);

    const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Replicate API error: ${response.status}`
      }, { status: response.status });
    }

    const data = await response.json();
    const status = data.status;

    if (status === 'succeeded') {
      const imageUrl = Array.isArray(data.output) ? data.output[0] : data.output;
      return NextResponse.json({
        success: true,
        data: {
          status: 'SUCCESS',
          imageUrl
        }
      });
    }

    if (status === 'failed' || status === 'canceled') {
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
    console.error('[ImageStatus] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check image status'
    }, { status: 500 });
  }
}
