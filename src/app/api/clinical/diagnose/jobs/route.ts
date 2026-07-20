import {NextResponse} from 'next/server';

export async function POST(request:Request) {
  const base=process.env.RAG_SERVICE_URL;
  if (!base) return NextResponse.json({error:'RAG_SERVICE_URL is not configured'},{status:503});
  try {
    const response=await fetch(`${base.replace(/\/$/,'')}/api/diagnose-jobs`,{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify(await request.json()),
      cache:'no-store',
      signal:AbortSignal.timeout(12000),
    });
    return NextResponse.json(await response.json(),{status:response.status});
  } catch {
    return NextResponse.json({error:'RAG job start failed'},{status:502});
  }
}
