export const runtime = 'edge';

import { NextResponse } from 'next/server';

// POST /api/generate-image
// Generates an image using various AI providers
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, size = '1024x1024', provider = 'pollinations', apiKey } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Please enter a prompt'
      }, { status: 400 });
    }

    const [width, height] = size.split('x').map(Number);
    const cleanPrompt = prompt.trim();
    const seed = Math.floor(Math.random() * 999999999);

    // Handle different providers
    switch (provider) {
      case 'pollinations': {
        // Pollinations.ai - Free, no API key needed
        // Use simple URL format for better compatibility
        const encodedPrompt = encodeURIComponent(cleanPrompt);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&seed=${seed}`;

        console.log('[ImageGen] Pollinations URL:', imageUrl);

        return NextResponse.json({
          success: true,
          data: {
            image: imageUrl,
            prompt: cleanPrompt,
            size: size
          },
          timestamp: new Date().toISOString()
        });
      }

      case 'openai': {
        if (!apiKey) {
          return NextResponse.json({
            success: false,
            error: 'OpenAI API key required',
            requiresKey: true
          }, { status: 401 });
        }

        // Call OpenAI DALL-E API
        const res = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt: cleanPrompt,
            n: 1,
            size: size as '1024x1024' | '1792x1024' | '1024x1792',
            quality: 'standard'
          })
        });

        if (!res.ok) {
          const error = await res.json().catch(() => ({}));
          return NextResponse.json({
            success: false,
            error: error.error?.message || 'OpenAI API error'
          }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json({
          success: true,
          data: {
            image: data.data[0].url,
            prompt: cleanPrompt,
            size: size
          },
          timestamp: new Date().toISOString()
        });
      }

      case 'zhipu': {
        if (!apiKey) {
          return NextResponse.json({
            success: false,
            error: 'Zhipu AI API key required',
            requiresKey: true
          }, { status: 401 });
        }

        // Call Zhipu AI CogView API
        const res = await fetch('https://open.bigmodel.cn/api/paas/v4/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'cogview-4',
            prompt: cleanPrompt,
            size: size
          })
        });

        if (!res.ok) {
          const error = await res.json().catch(() => ({}));
          return NextResponse.json({
            success: false,
            error: error.error?.message || 'Zhipu AI API error'
          }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json({
          success: true,
          data: {
            image: data.data[0]?.url || data.data?.[0]?.image_url,
            prompt: cleanPrompt,
            size: size
          },
          timestamp: new Date().toISOString()
        });
      }

      case 'stability': {
        if (!apiKey) {
          return NextResponse.json({
            success: false,
            error: 'Stability AI API key required',
            requiresKey: true
          }, { status: 401 });
        }

        // Call Stability AI API
        const res = await fetch('https://api.stability.ai/v2beta/stable-image/generate/core', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            text_prompts: [{ text: cleanPrompt }],
            cfg_scale: 7,
            height: height,
            width: width,
            steps: 30,
            samples: 1
          })
        });

        if (!res.ok) {
          const error = await res.json().catch(() => ({}));
          return NextResponse.json({
            success: false,
            error: error.message || 'Stability AI API error'
          }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json({
          success: true,
          data: {
            image: `data:image/png;base64,${data.artifacts[0].base64}`,
            prompt: cleanPrompt,
            size: size
          },
          timestamp: new Date().toISOString()
        });
      }

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown provider: ${provider}`
        }, { status: 400 });
    }

  } catch (error) {
    console.error('[ImageGen] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Something went wrong. Please try again.'
    }, { status: 500 });
  }
}
