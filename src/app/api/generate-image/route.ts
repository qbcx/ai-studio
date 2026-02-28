export const runtime = 'edge';

import ZAI from 'z-ai-web-dev-sdk';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const zai = await ZAI.create();
    const { prompt, size = '1024x1024' } = await request.json();

    const response = await zai.images.generations.create({
      prompt,
      size,
    });

    const imageBase64 = response.data[0]?.base64;

    return NextResponse.json({ 
      success: true, 
      image: imageBase64 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
