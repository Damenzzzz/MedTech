import {NextResponse} from 'next/server';
import {normalizeDiagnoseResponse} from '@/lib/ai/clinical-service.server';

export async function GET(_request:Request,{params}:{params:Promise<{jobId:string}>}) {
  const base=process.env.RAG_SERVICE_URL;
  if (!base) return NextResponse.json({error:'RAG_SERVICE_URL is not configured'},{status:503});
  const {jobId}=await params;
  try {
    const response=await fetch(`${base.replace(/\/$/,'')}/api/diagnose-jobs/${encodeURIComponent(jobId)}`,{
      cache:'no-store',
      signal:AbortSignal.timeout(12000),
    });
    const body=await response.json() as {status?:string;result?:Record<string,unknown>;[key:string]:unknown};
    if(response.ok && body.status==='completed' && body.result){
      body.result=normalizeDiagnoseResponse(body.result,`job-${jobId}`);
    }
    return NextResponse.json(body,{status:response.status});
  } catch {
    return NextResponse.json({error:'RAG job status failed',job_id:jobId,status:'proxy-error'},{status:502});
  }
}
