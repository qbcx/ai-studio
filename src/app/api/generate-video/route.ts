export const runtime = 'edge';

import ZAI from 'z-ai-web-dev-sdk';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const zai = await ZAI.create();
    const { prompt, quality = 'standard', duration = 5 } = await request.json();

    const response = await zai.videos.generations.create({
      prompt,
      quality,
      duration,
    });

    return NextResponse.json({ 
      success: true, 
      taskId: response.id 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
