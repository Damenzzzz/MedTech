import 'server-only';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySession, type SessionPayload } from '@/lib/auth/session.server';

export type SessionRole = SessionPayload['role'];

/**
 * Reads the `kms_session` cookie in a Server Component / Route Handler.
 * Returns null for anonymous visitors and for tampered or expired tokens.
 */
export async function getCurrentSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? verifySession(token) : null;
}

export async function getSessionRole(): Promise<SessionRole | null> {
  return (await getCurrentSession())?.role ?? null;
}
