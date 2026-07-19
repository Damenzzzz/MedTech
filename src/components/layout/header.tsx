'use client';
import {Activity,Languages,Moon,Sun} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {Link,usePathname,useRouter} from '@/i18n/navigation';
import {Button} from '@/components/ui/button';

export function Header(){
 const t=useTranslations('Nav');const path=usePathname();const router=useRouter();
 function theme(){const dark=document.documentElement.classList.toggle('dark');localStorage.setItem('kms-theme',dark?'dark':'light')}
 return <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-[color:var(--canvas)]/90 backdrop-blur dark:border-white/10"><div className="mx-auto flex h-16 max-w-7xl items-center gap-5 px-4 sm:px-6"><Link href="/" className="focus-ring flex items-center gap-2 rounded-lg font-bold"><span className="grid size-9 place-items-center rounded-xl bg-teal-700 text-white"><Activity size={19}/></span><span>КазМедСим</span></Link><nav className="ml-auto hidden items-center gap-1 md:flex"><Link className="focus-ring rounded-lg px-3 py-2 text-sm hover:bg-slate-200/50 dark:hover:bg-white/10" href="/patients">{t('patients')}</Link><Link className="focus-ring rounded-lg px-3 py-2 text-sm hover:bg-slate-200/50 dark:hover:bg-white/10" href="/dashboard">{t('dashboard')}</Link></nav><Button variant="ghost" size="sm" aria-label={t('theme')} onClick={theme}><Sun className="dark:hidden" size={17}/><Moon className="hidden dark:block" size={17}/></Button><div className="flex items-center gap-1 rounded-xl border border-slate-200 p-1 dark:border-white/10"><Languages size={15} className="ml-1 text-slate-500"/>{(['ru','kk','en'] as const).map(locale=><button key={locale} onClick={()=>router.replace(path,{locale})} className="focus-ring rounded-lg px-2 py-1 text-xs font-bold uppercase hover:bg-slate-100 dark:hover:bg-white/10">{locale}</button>)}</div></div></header>
}
