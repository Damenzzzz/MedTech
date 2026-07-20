import {NextResponse} from 'next/server';
import {getDemoRagFallback} from '@/lib/demo-rag';

export async function POST(request:Request) {
  const body=await request.json() as {symptoms?:string};
  const demo=getDemoRagFallback(String(body.symptoms??''));
  if (demo) return NextResponse.json({status:'completed',result:demo});

  const base=process.env.RAG_SERVICE_URL;
  if (!base) return NextResponse.json({error:'RAG_SERVICE_URL is not configured'},{status:503});
  try {
    const response=await fetch(`${base.replace(/\/$/,'')}/api/diagnose-jobs`,{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify(body),
      cache:'no-store',
      signal:AbortSignal.timeout(12000),
    });
    return NextResponse.json(await response.json(),{status:response.status});
  } catch {
    return NextResponse.json({error:'RAG job start failed'},{status:502});
  }
}
