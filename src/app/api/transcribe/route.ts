import {NextResponse} from 'next/server';

type Turn={speaker:'doctor'|'patient'|'relative'|'nurse'|'unknown';text:string;start?:number;end?:number};

export async function POST(request:Request) {
  const apiKey=process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({error:'OPENAI_API_KEY is not configured'}, {status:500});
  const input=await request.formData();
  const audio=input.get('audio');
  if (!(audio instanceof File)) return NextResponse.json({error:'audio file is required'}, {status:400});

  const result=await transcribeWithFallback(apiKey,audio);
  if (!result.ok) return NextResponse.json({error:result.error},{status:502});
  const raw=result.data;
  const turns=normalizeDiarized(raw);
  return NextResponse.json({text:raw.text??turns.map(x=>x.text).join(' '),turns,raw});
}

async function transcribeWithFallback(apiKey:string,audio:File) {
  const diarized=await transcribe(apiKey,audio,process.env.OPENAI_STT_MODEL??'gpt-4o-transcribe-diarize','diarized_json',true);
  if (diarized.ok) return diarized;
  const plain=await transcribe(apiKey,audio,'gpt-4o-transcribe','json',false);
  if (plain.ok) return plain;
  return {ok:false as const,error:plain.error||diarized.error||'Transcription failed'};
}

async function transcribe(apiKey:string,audio:File,model:string,responseFormat:string,diarized:boolean) {
  const form=new FormData();
  form.append('model',model);
  form.append('file',audio,audio.name||'audio.webm');
  form.append('response_format',responseFormat);
  if (diarized) form.append('chunking_strategy','auto');
  const response=await fetch('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{authorization:`Bearer ${apiKey}`},body:form,cache:'no-store'});
  if (!response.ok) return {ok:false as const,error:await response.text()};
  return {ok:true as const,data:await response.json() as Record<string,unknown>};
}

function normalizeDiarized(raw:Record<string,unknown>):Turn[] {
  const segments=(raw.segments??raw.words??[]) as Array<Record<string,unknown>>;
  if (!Array.isArray(segments) || !segments.length) {
    return raw.text?[{speaker:'unknown',text:String(raw.text)}]:[];
  }
  return segments.map(item=>({speaker:mapSpeaker(String(item.speaker??item.speaker_id??'unknown')),text:String(item.text??item.word??'').trim(),start:typeof item.start==='number'?item.start:undefined,end:typeof item.end==='number'?item.end:undefined})).filter(x=>x.text);
}

function mapSpeaker(value:string):Turn['speaker'] {
  const lower=value.toLowerCase();
  if (lower.includes('doctor') || lower.includes('врач')) return 'doctor';
  if (lower.includes('patient') || lower.includes('пациент')) return 'patient';
  if (lower.includes('nurse')) return 'nurse';
  if (lower.includes('relative')) return 'relative';
  return 'unknown';
}
