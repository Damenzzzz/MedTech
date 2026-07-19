import {getRagReferencesByCaseId} from '@/services/debrief.server';

export async function GET(request:Request){
 try{
  const caseId=new URL(request.url).searchParams.get('caseId');
  if(!caseId)return Response.json({error:'caseId_required'},{status:400});
  return Response.json({references:await getRagReferencesByCaseId(caseId)});
 }catch(error){
  return Response.json({error:error instanceof Error?error.message:'references_failed'},{status:400});
 }
}
