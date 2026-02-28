export const runtime = 'edge';

import { NextResponse } from 'next/server';

// POST /api/generate-image
// Generates an image using various AI providers
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, size = '1024x1024', provider = 'huggingface', apiKey } = body;

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
      case 'huggingface': {
        // Hugging Face Free Inference API - No API key required (with rate limits)
        // Using Stable Diffusion XL for quality images
        const model = 'stabilityai/stable-diffusion-xl-base-1.0';

        console.log('[ImageGen] Hugging Face request for:', cleanPrompt);

        try {
          const response = await fetch(
            `https://api-inference.huggingface.co/models/${model}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                // Optional: Add HF token for higher rate limits
                ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
              },
              body: JSON.stringify({
                inputs: cleanPrompt,
                parameters: {
                  width: Math.min(width, 1024),
                  height: Math.min(height, 1024),
                  num_inference_steps: 30
                }
              })
            }
          );

          if (!response.ok) {
            const errorText = await response.text();

            // Check if model is loading
            if (response.status === 503) {
              return NextResponse.json({
                success: false,
                error: 'Model is loading, please wait 30 seconds and try again',
                retryable: true
              }, { status: 503 });
            }

            // Rate limited
            if (response.status === 429) {
              return NextResponse.json({
                success: false,
                error: 'Rate limited. Try again in a minute or add a Hugging Face API token.'
              }, { status: 429 });
            }

            console.error('[ImageGen] HF error:', errorText);
            return NextResponse.json({
              success: false,
              error: `Hugging Face error: ${response.status}`
            }, { status: response.status });
          }

          // Get image blob
          const imageBuffer = await response.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(imageBuffer).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ''
            )
          );
          const dataUrl = `data:image/png;base64,${base64}`;

          return NextResponse.json({
            success: true,
            data: {
              image: dataUrl,
              prompt: cleanPrompt,
              size: size
            },
            timestamp: new Date().toISOString()
          });

        } catch (fetchError) {
          console.error('[ImageGen] HF fetch error:', fetchError);
          return NextResponse.json({
            success: false,
            error: 'Failed to connect to Hugging Face. Please try again.'
          }, { status: 502 });
        }
      }

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
              size: size
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
              quality: 'standard'
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
        if (!apiKey) {
          return NextResponse.json({
            success: false,
            error: 'Stability AI API key required. Get it from https://platform.stability.ai',
            requiresKey: true
          }, { status: 401 });
        }

        console.log('[ImageGen] Stability AI request for:', cleanPrompt);

        try {
          const response = await fetch('https://api.stability.ai/v2beta/stable-image/generate/core', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              text_prompts: [{ text: cleanPrompt }],
              cfg_scale: 7,
              height: Math.min(height, 1024),
              width: Math.min(width, 1024),
              steps: 30,
              samples: 1
            })
          });

          if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            return NextResponse.json({
              success: false,
              error: error.message || `Stability AI error: ${response.status}`
            }, { status: response.status });
          }

          const data = await response.json();
          return NextResponse.json({
            success: true,
            data: {
              image: `data:image/png;base64,${data.artifacts?.[0]?.base64 || data.image}`,
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
