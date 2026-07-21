import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { z } from 'zod';
import { IIN_REGEX } from '@/domain/schemas';

export const SESSION_COOKIE = 'kms_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const SessionPayloadSchema = z.union([
  z.object({ role: z.literal('doctor'), doctorId: z.string().uuid() }),
  z.object({ role: z.literal('patient'), iin: z.string().regex(IIN_REGEX) }),
]);
export type SessionPayload = z.infer<typeof SessionPayloadSchema>;

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_MAX_AGE_SECONDS,
};

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET не задан — добавь его в .env.local (см. .env.example)');
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ['HS256'] });
    const parsed = SessionPayloadSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
