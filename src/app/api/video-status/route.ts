export const runtime = 'edge';

import ZAI from 'z-ai-web-dev-sdk';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const zai = await ZAI.create();
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ 
        success: false, 
        error: 'taskId is required' 
      }, { status: 400 });
    }

    const response = await zai.videos.generations.status(taskId);

    return NextResponse.json({ 
      success: true, 
      status: response.status,
      video: response.video 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
