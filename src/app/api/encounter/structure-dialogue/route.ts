import 'server-only';
import { NextResponse } from 'next/server';
import {
  DialogueStructuringError,
  generateStructuredDialogue,
} from '@/lib/dialogue/structure-dialogue.server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { dialogue, cacheHit } = await generateStructuredDialogue(body);

    return NextResponse.json(dialogue, {
      headers: {
        'x-dialogue-cache-hit': cacheHit ? '1' : '0',
      },
    });
  } catch (error) {
    console.error('[structure-dialogue route error]', error);

    if (error instanceof DialogueStructuringError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Ошибка структурирования диалога',
        code: 'DIALOGUE_STRUCTURING_FAILED',
      },
      { status: 400 },
    );
  }
}
