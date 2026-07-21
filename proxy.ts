import createMiddleware from 'next-intl/middleware';
import {NextRequest,NextResponse} from 'next/server';
import {routing,type Locale} from './src/i18n/routing';
import {SESSION_COOKIE,verifySession} from './src/lib/auth/session.server';

const handleI18nRouting=createMiddleware(routing);
const DOCTOR_ONLY_SEGMENTS=new Set(['ai-assistant','dashboard']);

function isLocale(value:string):value is Locale{return (routing.locales as readonly string[]).includes(value)}

export default async function proxy(request:NextRequest){
  const response=handleI18nRouting(request);

  // Let next-intl's own redirects (e.g. adding a missing locale prefix) pass through untouched.
  if(response.headers.get('location')) return response;

  const segments=request.nextUrl.pathname.split('/').filter(Boolean);
  const [maybeLocale,section,sub]=segments;
  const locale=isLocale(maybeLocale)?maybeLocale:routing.defaultLocale;

  const token=request.cookies.get(SESSION_COOKIE)?.value;
  const session=token?await verifySession(token):null;

  if(DOCTOR_ONLY_SEGMENTS.has(section) && session?.role!=='doctor'){
    return NextResponse.redirect(new URL(`/${locale}/patient-portal`,request.url));
  }

  if(section==='patient-portal' && sub && sub!=='doctor' && sub!=='patient'){
    const patientOwnProfile=session?.role==='patient' && session.iin===sub;
    const doctorProfileAccess=session?.role==='doctor';
    if(!patientOwnProfile && !doctorProfileAccess){
      return NextResponse.redirect(new URL(`/${locale}/patient-portal`,request.url));
    }
  }

  return response;
}

export const config={matcher:['/((?!api|_next|_vercel|.*\\..*).*)']};
