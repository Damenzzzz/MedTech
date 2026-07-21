import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const base = process.env.RAG_SERVICE_URL;
  if (!base) {
    return NextResponse.json({ error: 'RAG_SERVICE_URL is not configured' }, { status: 503 });
  }

  try {
    const response = await fetch(
      `${base.replace(/\/$/, '')}/api/protocols/${encodeURIComponent(id)}`,
      { cache: 'no-store', signal: AbortSignal.timeout(15000) },
    );
    const body = await response.json().catch(() => ({ error: 'RAG service returned invalid JSON' }));
    return NextResponse.json(body, {
      status: response.status,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    console.error('[protocol proxy]', error);
    return NextResponse.json({ error: 'RAG-сервис протоколов недоступен' }, { status: 502 });
  }
}
