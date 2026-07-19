import {NextResponse} from 'next/server';

export async function POST(request:Request) {
  const body=await request.json();
  const base=process.env.RAG_SERVICE_URL;
  if (base) {
    try {
      const response=await fetch(`${base.replace(/\/$/,'')}/api/refine`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
      if (response.ok) return NextResponse.json(await response.json());
    } catch {}
  }
  const demo=(await import('../diagnose/route')).POST;
  return demo(new Request(request.url,{method:'POST',body:JSON.stringify({symptoms:body.symptoms}),headers:{'content-type':'application/json'}}));
}
