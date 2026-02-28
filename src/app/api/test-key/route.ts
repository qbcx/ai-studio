export const runtime = 'edge';

import { NextResponse } from 'next/server';

// POST /api/test-key
// Test if an API key is valid
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { provider, apiKey } = body;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'No API key provided'
      }, { status: 400 });
    }

    // Test based on provider
    switch (provider) {
      case 'huggingface': {
        // Test HF token by fetching user info
        const res = await fetch('https://huggingface.co/api/whoami-v2', {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        });

        if (res.ok) {
          return NextResponse.json({ success: true });
        } else {
          return NextResponse.json({
            success: false,
            error: 'Invalid Hugging Face token'
          }, { status: 401 });
        }
      }

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

      default:
        // For unknown providers, just check if key exists
        return NextResponse.json({
          success: true,
          note: 'Test not implemented for this provider'
        });
    }

  } catch (error) {
    console.error('API key test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to test API key. Check your connection.'
    }, { status: 500 });
  }
}
