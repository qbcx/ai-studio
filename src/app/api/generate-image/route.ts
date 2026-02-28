export const runtime = 'edge';

import { NextResponse } from 'next/server';

// POST /api/generate-image
// Generates an image using various AI providers
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, size = '1024x1024', provider = 'zhipu', apiKey, removeWatermark } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Please enter a prompt'
      }, { status: 400 });
    }

    const [width, height] = size.split('x').map(Number);
    const cleanPrompt = prompt.trim();

    // Handle different providers
    switch (provider) {
      case 'zhipu': {
        if (!apiKey) {
          return NextResponse.json({
            success: false,
            error: 'Zhipu AI API key required. Get it from https://open.bigmodel.cn',
            requiresKey: true
          }, { status: 401 });
        }

        console.log('[ImageGen] Zhipu AI request for:', cleanPrompt);

        try {
          // Zhipu CogView-4 API
          const response = await fetch('https://open.bigmodel.cn/api/paas/v4/images/generations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: 'cogview-4',
              prompt: cleanPrompt,
              size: size,
              // Add watermark removal if supported
              ...(removeWatermark && { nologo: true })
            })
          });

          if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            return NextResponse.json({
              success: false,
              error: error.error?.message || error.message || `Zhipu AI error: ${response.status}`
            }, { status: response.status });
          }

          const data = await response.json();
          const imageUrl = data.data?.[0]?.url || data.data?.[0]?.image_url || data.data?.url;

          if (!imageUrl) {
            console.error('[ImageGen] Zhipu response:', data);
            return NextResponse.json({
              success: false,
              error: 'No image URL in response'
            }, { status: 500 });
          }

          return NextResponse.json({
            success: true,
            data: {
              image: imageUrl,
              prompt: cleanPrompt,
              size: size
            },
            timestamp: new Date().toISOString()
          });

        } catch (fetchError) {
          console.error('[ImageGen] Zhipu fetch error:', fetchError);
          return NextResponse.json({
            success: false,
            error: 'Failed to connect to Zhipu AI. Check your API key.'
          }, { status: 502 });
        }
      }

      case 'openai': {
        if (!apiKey) {
          return NextResponse.json({
            success: false,
            error: 'OpenAI API key required. Get it from https://platform.openai.com/api-keys',
            requiresKey: true
          }, { status: 401 });
        }

        console.log('[ImageGen] OpenAI request for:', cleanPrompt);

        try {
          const response = await fetch('https://api.openai.com/v1/images/generations', {
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
              quality: 'standard',
              response_format: 'url'
            })
          });

          if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            return NextResponse.json({
              success: false,
              error: error.error?.message || `OpenAI error: ${response.status}`
            }, { status: response.status });
          }

          const data = await response.json();
          return NextResponse.json({
            success: true,
            data: {
              image: data.data[0].url,
              prompt: cleanPrompt,
              size: size
            },
            timestamp: new Date().toISOString(),
            // Note: DALL-E 3 includes watermarks by default
            watermarkNote: removeWatermark ? 'DALL-E 3 images include embedded watermarks that cannot be removed via API' : undefined
          });

        } catch (fetchError) {
          console.error('[ImageGen] OpenAI fetch error:', fetchError);
          return NextResponse.json({
            success: false,
            error: 'Failed to connect to OpenAI. Check your API key.'
          }, { status: 502 });
        }
      }

      case 'stability': {
        if (!apiKey) {
          return NextResponse.json({
            success: false,
            error: 'Stability AI API key required. Get it from https://platform.stability.ai',
            requiresKey: true
          }, { status: 401 });
        }

        console.log('[ImageGen] Stability AI request for:', cleanPrompt);

        try {
          const formData = new FormData();
          formData.append('text_prompts[0][text]', cleanPrompt);
          formData.append('cfg_scale', '7');
          formData.append('height', String(Math.min(height, 1024)));
          formData.append('width', String(Math.min(width, 1024)));
          formData.append('steps', '30');
          formData.append('samples', '1');

          const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Accept': 'application/json'
            },
            body: formData
          });

          if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            return NextResponse.json({
              success: false,
              error: error.message || `Stability AI error: ${response.status}`
            }, { status: response.status });
          }

          const data = await response.json();
          const imageData = data.artifacts?.[0]?.base64;

          if (!imageData) {
            return NextResponse.json({
              success: false,
              error: 'No image data in response'
            }, { status: 500 });
          }

          return NextResponse.json({
            success: true,
            data: {
              image: `data:image/png;base64,${imageData}`,
              prompt: cleanPrompt,
              size: size
            },
            timestamp: new Date().toISOString()
          });

        } catch (fetchError) {
          console.error('[ImageGen] Stability fetch error:', fetchError);
          return NextResponse.json({
            success: false,
            error: 'Failed to connect to Stability AI. Check your API key.'
          }, { status: 502 });
        }
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
