import 'server-only';
import { NextResponse } from 'next/server';
import { generateEncounterProtocol } from '@/lib/protocol/encounter-protocol.server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { protocol, cacheHit } = await generateEncounterProtocol(body);

    return NextResponse.json(protocol, {
      headers: {
        'x-protocol-cache-hit': cacheHit ? '1' : '0',
      },
    });
  } catch (error) {
    console.error('[encounter protocol route error]', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Ошибка формирования протокола',
        code: 'PROTOCOL_GENERATION_FAILED',
      },
      { status: 400 },
    );
  }
}
