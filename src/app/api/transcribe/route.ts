import {NextResponse} from 'next/server';

type Turn={speaker:'doctor'|'patient'|'relative'|'nurse'|'unknown';text:string;start?:number;end?:number};

export async function POST(request:Request) {
  const apiKey=process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({error:'OPENAI_API_KEY is not configured'}, {status:500});
  const input=await request.formData();
  const audio=input.get('audio');
  if (!(audio instanceof File)) return NextResponse.json({error:'audio file is required'}, {status:400});

  const form=new FormData();
  form.append('model',process.env.OPENAI_STT_MODEL??'gpt-4o-transcribe-diarize');
  form.append('file',audio,audio.name||'audio.webm');
  form.append('response_format','diarized_json');
  const transcription=await fetch('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{authorization:`Bearer ${apiKey}`},body:form,cache:'no-store'});
  if (!transcription.ok) return NextResponse.json({error:await transcription.text()},{status:502});
  const raw=await transcription.json();
  const turns=normalizeDiarized(raw);
  return NextResponse.json({text:raw.text??turns.map(x=>x.text).join(' '),turns,raw});
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
