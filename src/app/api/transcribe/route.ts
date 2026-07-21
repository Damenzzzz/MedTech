import 'server-only';
import { NextResponse } from 'next/server';
import { transcribeAudio, validateAudioFile } from '@/lib/stt/openai-stt.server';

export async function POST(request: Request) {
  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: 'Запрос должен быть в формате multipart/form-data', code: 'INVALID_CONTENT_TYPE' },
        { status: 400 },
      );
    }

    const audio = formData.get('audio');
    const language = formData.get('language') ? String(formData.get('language')) : undefined;

    if (!audio || typeof audio === 'string') {
      return NextResponse.json(
        { error: 'Поле audio с аудиофайлом обязательно.', code: 'AUDIO_MISSING' },
        { status: 400 },
      );
    }

    const file = audio as File;

    // Validate size and format
    const validation = validateAudioFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error, code: validation.code },
        { status: validation.status },
      );
    }

    const result = await transcribeAudio(file, { language });
    return NextResponse.json(result);
  } catch (error) {
    const errObj = error as { status?: number; code?: string; message?: string };
    const status = typeof errObj.status === 'number' ? errObj.status : 500;
    const message = errObj.message || 'Ошибка обработки транскрибации.';
    const code = errObj.code || 'TRANSCRIPTION_FAILED';

    console.error('[transcribe route error]', { code, status, message });

    return NextResponse.json(
      { error: message, code },
      { status },
    );
  }
}
