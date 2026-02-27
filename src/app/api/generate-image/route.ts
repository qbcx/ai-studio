import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

// Supported image sizes
const SUPPORTED_SIZES = [
  '1024x1024',
  '768x1344',
  '864x1152',
  '1344x768',
  '1152x864',
  '1440x720',
  '720x1440'
] as const;

type ImageSize = typeof SUPPORTED_SIZES[number];

interface GenerateImageRequest {
  prompt: string;
  size?: ImageSize;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateImageRequest = await request.json();
    const { prompt, size = '1024x1024' } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (!SUPPORTED_SIZES.includes(size)) {
      return NextResponse.json(
        { success: false, error: `Invalid size. Supported sizes: ${SUPPORTED_SIZES.join(', ')}` },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();

    const response = await zai.images.generations.create({
      prompt: prompt.trim(),
      size: size
    });

    if (!response.data || !response.data[0] || !response.data[0].base64) {
      return NextResponse.json(
        { success: false, error: 'Invalid response from image generation API' },
        { status: 500 }
      );
    }

    const imageBase64 = response.data[0].base64;

    return NextResponse.json({
      success: true,
      image: `data:image/png;base64,${imageBase64}`,
      prompt: prompt,
      size: size,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Image generation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
