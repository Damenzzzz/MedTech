import { getCurrentSession } from '@/lib/auth/session-role.server';
import { Header } from './header';

/**
 * Server wrapper that reads the role from the `kms_session` cookie and hands it
 * to the client Header, so navigation is decided on the server instead of being
 * guessed from client state. Sign-in screens render `<Header variant="minimal"/>`
 * directly and stay static.
 */
export async function SiteHeader({ variant = 'full' }: { variant?: 'full' | 'minimal' }) {
  const session = await getCurrentSession();

  return (
    <Header
      role={session?.role ?? null}
      variant={variant}
      patientIin={session?.role === 'patient' ? session.iin : undefined}
    />
  );
}
