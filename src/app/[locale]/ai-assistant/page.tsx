import {setRequestLocale} from 'next-intl/server';
import {Header} from '@/components/layout/header';
import {ClinicalAIWorkspace} from '@/components/ai/clinical-ai-workspace';

export default async function AIAssistantPage({params}:{params:Promise<{locale:string}>}) {
  const {locale}=await params;
  setRequestLocale(locale);
  return <>
    <Header/>
    <ClinicalAIWorkspace/>
  </>;
}
