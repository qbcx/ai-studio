export const runtime = 'edge';

import { NextResponse } from 'next/server';

// POST /api/generate-image
// Generates an image using Pollinations.ai (free, no API key required)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, size = '1024x1024' } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Please enter a prompt'
      }, { status: 400 });
    }

    const [width, height] = size.split('x').map(Number);
    const cleanPrompt = prompt.trim();
    const seed = Math.floor(Math.random() * 999999999);

    // Build Pollinations URL
    // Format: https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=1024&model=flux&seed=123&nologo=true
    const encodedPrompt = encodeURIComponent(cleanPrompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&model=flux&seed=${seed}&nologo=true`;

    console.log('[ImageGen] Generated URL:', imageUrl);

    // Return the image URL directly - browser will load it
    return NextResponse.json({
      success: true,
      data: {
        image: imageUrl,
        prompt: cleanPrompt,
        size: size
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[ImageGen] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Something went wrong. Please try again.'
    }, { status: 500 });
  }
}
