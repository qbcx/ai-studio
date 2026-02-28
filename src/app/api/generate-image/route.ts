export const runtime = 'edge';

import { NextResponse } from 'next/server';

// POST /api/generate-image
// Returns image URL directly (client loads it) - no server-side fetch needed
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, size = '1024x1024' } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Prompt is required'
      }, { status: 400 });
    }

    const [width, height] = size.split('x').map(Number);
    const seed = Math.floor(Math.random() * 1000000);

    // Return the Pollinations URL - client will load it directly
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&seed=${seed}&model=flux&enhance=true`;

    return NextResponse.json({
      success: true,
      image: imageUrl,
      prompt,
      size,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
