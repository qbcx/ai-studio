export const runtime = 'edge';

import { NextResponse } from 'next/server';

// Security: Rate limiting map (in-memory, resets on deploy)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW = 60000; // 1 minute

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

// Security: Sanitize prompt to prevent injection
function sanitizePrompt(prompt: string): string {
  // Remove potentially dangerous characters and limit length
  return prompt
    .replace(/[<>]/g, '')
    .replace(/[\x00-\x1F]/g, '')
    .slice(0, 2000)
    .trim();
}

// Security: Validate API key format
function validateApiKey(provider: string, key: string): boolean {
  if (!key || key.length < 10) return false;

  switch (provider) {
    case 'openai':
      return key.startsWith('sk-');
    case 'zhipu':
      return key.length >= 20;
    case 'stability':
      return key.startsWith('sk-') || key.length >= 20;
    case 'replicate':
      return key.startsWith('r8_') || key.length >= 20;
    case 'fal':
      return key.length >= 20;
    case 'gemini':
      return key.startsWith('AI') || key.length >= 20;
    default:
      return key.length >= 10;
  }
}

// POST /api/generate-image
export async function POST(request: Request) {
  try {
    // Security: Get client IP for rate limiting
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
    const { prompt, size = '1024x1024', provider = 'zhipu', apiKey, removeWatermark } = body;

    // Validate prompt
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Please enter a prompt'
      }, { status: 400 });
    }

    const cleanPrompt = sanitizePrompt(prompt);

    // Validate size
    const validSizes = ['1024x1024', '1024x1792', '1792x1024'];
    const validSize = validSizes.includes(size) ? size : '1024x1024';
    const [width, height] = validSize.split('x').map(Number);

    // Handle different providers
    switch (provider) {
      case 'zhipu': {
        if (!apiKey || !validateApiKey('zhipu', apiKey)) {
          return NextResponse.json({
            success: false,
            error: 'Valid Zhipu AI API key required. Get it from https://open.bigmodel.cn',
            requiresKey: true
          }, { status: 401 });
        }

        console.log('[ImageGen] Zhipu AI request');

        try {
          const response = await fetch('https://open.bigmodel.cn/api/paas/v4/images/generations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: 'cogview-4',
              prompt: cleanPrompt,
              size: validSize
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
              size: validSize
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
        if (!apiKey || !validateApiKey('openai', apiKey)) {
          return NextResponse.json({
            success: false,
            error: 'Valid OpenAI API key required. Get it from https://platform.openai.com/api-keys',
            requiresKey: true
          }, { status: 401 });
        }

        console.log('[ImageGen] OpenAI request');

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
              size: validSize as '1024x1024' | '1792x1024' | '1024x1792',
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
              size: validSize
            },
            timestamp: new Date().toISOString()
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
        if (!apiKey || !validateApiKey('stability', apiKey)) {
          return NextResponse.json({
            success: false,
            error: 'Valid Stability AI API key required. Get it from https://platform.stability.ai',
            requiresKey: true
          }, { status: 401 });
        }

        console.log('[ImageGen] Stability AI request');

        try {
          // Use Stability AI v2beta API with JSON body
          const response = await fetch('https://api.stability.ai/v2beta/stable-image/generate/core', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              prompt: cleanPrompt,
              output_format: 'png',
              aspect_ratio: width > height ? '16:9' : height > width ? '9:16' : '1:1',
              mode: 'text-to-image'
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Stability AI error: ${response.status}`;

            try {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.message || errorJson.errors?.[0] || errorMessage;
            } catch {
              if (errorText) errorMessage = errorText.slice(0, 200);
            }

            return NextResponse.json({
              success: false,
              error: errorMessage
            }, { status: response.status });
          }

          const data = await response.json();

          // Handle different response formats
          let imageData = data.image || data.artifacts?.[0]?.base64 || data.data?.[0]?.base64;

          if (!imageData) {
            console.error('[ImageGen] Stability response:', JSON.stringify(data).slice(0, 500));
            return NextResponse.json({
              success: false,
              error: 'No image data in response'
            }, { status: 500 });
          }

          // If image is a URL, return as-is; if base64, add prefix
          const imageUrl = imageData.startsWith('http')
            ? imageData
            : imageData.startsWith('data:')
              ? imageData
              : `data:image/png;base64,${imageData}`;

          return NextResponse.json({
            success: true,
            data: {
              image: imageUrl,
              prompt: cleanPrompt,
              size: validSize
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

      case 'replicate': {
        if (!apiKey || !validateApiKey('replicate', apiKey)) {
          return NextResponse.json({
            success: false,
            error: 'Valid Replicate API key required. Get it from https://replicate.com/account/api-tokens',
            requiresKey: true
          }, { status: 401 });
        }

        console.log('[ImageGen] Replicate Flux request');

        try {
          // Use Flux Schnell model for fast generation
          const response = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              version: 'black-forest-labs/flux-schnell',
              input: {
                prompt: cleanPrompt,
                go_fast: true,
                num_outputs: 1,
                aspect_ratio: width > height ? '16:9' : height > width ? '9:16' : '1:1',
                output_format: 'jpg',
                output_quality: 90
              }
            })
          });

          if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            return NextResponse.json({
              success: false,
              error: error.detail || error.error?.message || `Replicate error: ${response.status}`
            }, { status: response.status });
          }

          const data = await response.json();

          // Replicate returns a prediction that we need to poll
          // For now, return the prediction ID and let client poll
          return NextResponse.json({
            success: true,
            data: {
              predictionId: data.id,
              status: data.status,
              pollUrl: data.urls?.get,
              provider: 'replicate',
              prompt: cleanPrompt,
              size: validSize
            },
            timestamp: new Date().toISOString()
          });

        } catch (fetchError) {
          console.error('[ImageGen] Replicate fetch error:', fetchError);
          return NextResponse.json({
            success: false,
            error: 'Failed to connect to Replicate. Check your API key.'
          }, { status: 502 });
        }
      }

      case 'fal': {
        if (!apiKey || !validateApiKey('fal', apiKey)) {
          return NextResponse.json({
            success: false,
            error: 'Valid fal.ai API key required. Get it from https://fal.ai/dashboard/keys',
            requiresKey: true
          }, { status: 401 });
        }

        console.log('[ImageGen] fal.ai Flux request');

        try {
          const response = await fetch('https://fal.run/fal-ai/flux/schnell', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Key ${apiKey}`
            },
            body: JSON.stringify({
              prompt: cleanPrompt,
              image_size: validSize,
              num_inference_steps: 4,
              num_images: 1,
              enable_safety_checker: true
            })
          });

          if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            return NextResponse.json({
              success: false,
              error: error.detail || error.error || `fal.ai error: ${response.status}`
            }, { status: response.status });
          }

          const data = await response.json();
          const imageUrl = data.images?.[0]?.url || data.image?.url;

          if (!imageUrl) {
            return NextResponse.json({
              success: false,
              error: 'No image URL in fal.ai response'
            }, { status: 500 });
          }

          return NextResponse.json({
            success: true,
            data: {
              image: imageUrl,
              prompt: cleanPrompt,
              size: validSize
            },
            timestamp: new Date().toISOString()
          });

        } catch (fetchError) {
          console.error('[ImageGen] fal.ai fetch error:', fetchError);
          return NextResponse.json({
            success: false,
            error: 'Failed to connect to fal.ai. Check your API key.'
          }, { status: 502 });
        }
      }

      case 'gemini': {
        if (!apiKey || !validateApiKey('gemini', apiKey)) {
          return NextResponse.json({
            success: false,
            error: 'Valid Gemini API key required. Get it from https://aistudio.google.com/api-keys',
            requiresKey: true
          }, { status: 401 });
        }

        console.log('[ImageGen] Gemini Imagen request');

        try {
          // Use Imagen 3 for image generation via Gemini API
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              instances: [{
                prompt: cleanPrompt
              }],
              parameters: {
                sampleCount: 1,
                aspectRatio: width > height ? '16:9' : height > width ? '9:16' : '1:1'
              }
            })
          });

          if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            return NextResponse.json({
              success: false,
              error: error.error?.message || error.error || `Gemini error: ${response.status}`
            }, { status: response.status });
          }

          const data = await response.json();
          // Imagen returns base64 encoded image
          const imageBase64 = data.predictions?.[0]?.bytesBase64Encoded;

          if (!imageBase64) {
            return NextResponse.json({
              success: false,
              error: 'No image data in Gemini response'
            }, { status: 500 });
          }

          return NextResponse.json({
            success: true,
            data: {
              image: `data:image/png;base64,${imageBase64}`,
              prompt: cleanPrompt,
              size: validSize
            },
            timestamp: new Date().toISOString()
          });

        } catch (fetchError) {
          console.error('[ImageGen] Gemini fetch error:', fetchError);
          return NextResponse.json({
            success: false,
            error: 'Failed to connect to Gemini. Check your API key.'
          }, { status: 502 });
        }
      }

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown provider: ${provider}. Supported: zhipu, openai, stability, replicate, fal, gemini`
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
