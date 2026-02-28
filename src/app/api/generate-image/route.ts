export const runtime = 'edge';

import { NextResponse } from 'next/server';

// POST /api/generate-image
// Simple, reliable image generation using Pollinations
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
    const seed = Math.floor(Math.random() * 100000000);
    const cleanPrompt = prompt.trim();

    // Pollinations.ai - Works reliably, no key needed
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true`;

    return NextResponse.json({
      success: true,
      data: {
        image: imageUrl,
        prompt: cleanPrompt,
        size
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Something went wrong. Please try again.'
    }, { status: 500 });
  }
}
