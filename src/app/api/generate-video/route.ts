import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

interface GenerateVideoRequest {
  prompt?: string;
  image_url?: string | string[];
  quality?: 'speed' | 'quality';
  duration?: 5 | 10;
  fps?: 30 | 60;
  size?: string;
  with_audio?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateVideoRequest = await request.json();
    const {
      prompt,
      image_url,
      quality = 'speed',
      duration = 5,
      fps = 30,
      size,
      with_audio = false
    } = body;

    if (!prompt && !image_url) {
      return NextResponse.json(
        { success: false, error: 'Either prompt or image_url is required' },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();

    const task = await zai.video.generations.create({
      prompt: prompt?.trim(),
      image_url,
      quality,
      duration,
      fps,
      size,
      with_audio
    });

    return NextResponse.json({
      success: true,
      taskId: task.id,
      status: task.task_status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Video generation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
