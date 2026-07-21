// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

describe('lightweight identification session (jose JWT cookie)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv, SESSION_SECRET: 'test-secret-at-least-32-bytes-long-xxxxx' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('round-trips a doctor session payload', async () => {
    const { signSession, verifySession } = await import('@/lib/auth/session.server');

    const token = await signSession({ role: 'doctor', doctorId: '3c1e9f8a-1b2c-4d3e-9f10-abcdef123456' });
    const payload = await verifySession(token);

    expect(payload).toEqual({ role: 'doctor', doctorId: '3c1e9f8a-1b2c-4d3e-9f10-abcdef123456' });
  });

  it('round-trips a patient session payload', async () => {
    const { signSession, verifySession } = await import('@/lib/auth/session.server');

    const token = await signSession({ role: 'patient', iin: '123456789012' });
    const payload = await verifySession(token);

    expect(payload).toEqual({ role: 'patient', iin: '123456789012' });
  });

  it('rejects a tampered token', async () => {
    const { signSession, verifySession } = await import('@/lib/auth/session.server');

    const token = await signSession({ role: 'patient', iin: '123456789012' });
    const [header, , signature] = token.split('.');
    const tamperedPayload = Buffer.from(JSON.stringify({ role: 'patient', iin: '999999999999' })).toString('base64url');
    const tampered = `${header}.${tamperedPayload}.${signature}`;

    expect(await verifySession(tampered)).toBeNull();
  });

  it('rejects garbage input instead of throwing', async () => {
    const { verifySession } = await import('@/lib/auth/session.server');
    expect(await verifySession('not-a-jwt')).toBeNull();
  });

  it('rejects a token signed with a different secret', async () => {
    const { signSession } = await import('@/lib/auth/session.server');
    const token = await signSession({ role: 'doctor', doctorId: '3c1e9f8a-1b2c-4d3e-9f10-abcdef123456' });

    vi.resetModules();
    process.env = { ...originalEnv, SESSION_SECRET: 'a-completely-different-secret-value-yyyy' };
    const { verifySession } = await import('@/lib/auth/session.server');

    expect(await verifySession(token)).toBeNull();
  });

  it('throws a clear error when SESSION_SECRET is missing', async () => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.SESSION_SECRET;

    const { signSession } = await import('@/lib/auth/session.server');
    await expect(signSession({ role: 'doctor', doctorId: '3c1e9f8a-1b2c-4d3e-9f10-abcdef123456' })).rejects.toThrow(
      'SESSION_SECRET',
    );
  });
});
