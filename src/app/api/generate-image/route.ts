export const runtime = 'edge';

import { NextResponse } from 'next/server';

// Supported providers and their API endpoints
const IMAGE_PROVIDERS = {
  pollinations: {
    name: 'Pollinations.ai',
    generateUrl: (prompt: string, width: number, height: number, seed: number) =>
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&seed=${seed}&model=flux&enhance=true`,
    requiresKey: false
  },
  zhipu: {
    name: 'Zhipu AI',
    endpoint: 'https://open.bigmodel.cn/api/paas/v4/images/generations',
    requiresKey: true,
    body: (prompt: string, size: string) => ({
      model: 'cogview-3-plus',
      prompt,
      size
    })
  },
  openai: {
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/images/generations',
    requiresKey: true,
    body: (prompt: string, size: string) => ({
      model: 'dall-e-3',
      prompt,
      size: size === '1024x1024' ? '1024x1024' : '1024x1024',
      quality: 'standard',
      n: 1
    })
  },
  stability: {
    name: 'Stability AI',
    endpoint: 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
    requiresKey: true,
    body: (prompt: string, width: number, height: number) => ({
      text_prompts: [{ text: prompt }],
      cfg_scale: 7,
      height,
      width,
      steps: 30
    })
  },
  replicate: {
    name: 'Replicate',
    endpoint: 'https://api.replicate.com/v1/predictions',
    requiresKey: true,
    body: (prompt: string, width: number, height: number) => ({
      version: 'black-forest-labs/flux-schnell',
      input: { prompt, width, height }
    })
  }
};

type ProviderKey = keyof typeof IMAGE_PROVIDERS;

// POST /api/generate-image
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, size = '1024x1024', provider = 'pollinations', apiKey } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Prompt is required'
      }, { status: 400 });
    }

    const [width, height] = size.split('x').map(Number);
    const seed = Math.floor(Math.random() * 1000000);

    // Get provider config
    const providerConfig = IMAGE_PROVIDERS[provider as ProviderKey] || IMAGE_PROVIDERS.pollinations;

    // Check if key is required
    if (providerConfig.requiresKey && !apiKey) {
      return NextResponse.json({
        success: false,
        error: `API key required for ${providerConfig.name}. Add it in Settings.`,
        requiresKey: true,
        provider
      }, { status: 401 });
    }

    // Pollinations - direct URL (free, no key needed)
    if (provider === 'pollinations' || !apiKey) {
      const imageUrl = IMAGE_PROVIDERS.pollinations.generateUrl(prompt, width, height, seed);

      return NextResponse.json({
        success: true,
        data: {
          image: imageUrl,
          prompt,
          size
        },
        timestamp: new Date().toISOString()
      });
    }

    // Other providers - make API call
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Set auth header based on provider
      if (provider === 'zhipu') {
        headers['Authorization'] = `Bearer ${apiKey}`;
      } else if (provider === 'openai') {
        headers['Authorization'] = `Bearer ${apiKey}`;
      } else if (provider === 'stability') {
        headers['Authorization'] = `Bearer ${apiKey}`;
      } else if (provider === 'replicate') {
        headers['Authorization'] = `Token ${apiKey}`;
      }

      const requestBody = providerConfig.body ? providerConfig.body(prompt, size, width, height) : { prompt, size };

      const response = await fetch(providerConfig.endpoint!, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json({
          success: false,
          error: `${providerConfig.name} API error: ${response.status}`
        }, { status: response.status });
      }

      const data = await response.json();

      // Extract image URL based on provider
      let imageUrl: string | undefined;
      if (provider === 'openai') {
        imageUrl = data.data?.[0]?.url;
      } else if (provider === 'stability') {
        imageUrl = data.artifacts?.[0]?.base64 ? `data:image/png;base64,${data.artifacts[0].base64}` : undefined;
      } else if (provider === 'replicate') {
        // Replicate returns a prediction, need to poll for result
        return NextResponse.json({
          success: false,
          error: 'Replicate requires polling. Use Pollinations for direct results.',
          fallback: true
        }, { status: 400 });
      } else {
        imageUrl = data.data?.[0]?.url || data.data?.[0]?.b64_json;
      }

      if (!imageUrl) {
        return NextResponse.json({
          success: false,
          error: 'No image returned from API'
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: {
          image: imageUrl,
          prompt,
          size
        },
        timestamp: new Date().toISOString()
      });

    } catch (fetchError) {
      // Fallback to Pollinations if provider API fails
      console.error(`${provider} API failed, using Pollinations fallback:`, fetchError);
      const imageUrl = IMAGE_PROVIDERS.pollinations.generateUrl(prompt, width, height, seed);

      return NextResponse.json({
        success: true,
        data: {
          image: imageUrl,
          prompt,
          size
        },
        timestamp: new Date().toISOString(),
        fallback: true
      });
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
