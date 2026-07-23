import {NextIntlClientProvider,hasLocale} from 'next-intl';
import {getMessages,setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {Geist,Geist_Mono} from 'next/font/google';
import {routing} from '@/i18n/routing';
import {ThemeProvider} from '@/components/providers/theme-provider';
const geist=Geist({subsets:['latin','cyrillic'],variable:'--font-geist'});
const geistMono=Geist_Mono({subsets:['latin'],variable:'--font-geist-mono'});
export function generateStaticParams(){return routing.locales.map(locale=>({locale}))}
export async function generateMetadata({params}:{params:Promise<{locale:string}>}){const {locale}=await params;const messages=(await import(`../../../messages/${locale}.json`)).default;return {title:messages.Meta.title,description:messages.Meta.description}}
export default async function LocaleLayout({children,params}:{children:React.ReactNode;params:Promise<{locale:string}>}){const {locale}=await params;if(!hasLocale(routing.locales,locale))notFound();setRequestLocale(locale);const messages=await getMessages();return <html lang={locale} className={`${geist.variable} ${geistMono.variable}`} suppressHydrationWarning><body className="spatial-bg min-h-screen"><NextIntlClientProvider messages={messages}><ThemeProvider>{children}</ThemeProvider></NextIntlClientProvider></body></html>}
