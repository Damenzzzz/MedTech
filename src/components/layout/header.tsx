'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Activity,
  Home,
  Users,
  LineChart,
  Bot,
  FileText,
  MessageCircleHeart,
  User,
  BookOpen,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useUserStore } from '@/stores/user-store';

export type HeaderRole = 'doctor' | 'patient' | null;

type NavIcon = typeof Home;

/**
 * `minimal` renders brand + language only — used on the role picker and every
 * sign-in screen. An anonymous visitor always collapses to `minimal`, so no
 * navigation can leak before a role is chosen.
 *
 * Shell shape follows the Spatial design: one floating glass pill holds the
 * brand, primary nav and language switcher on desktop. Below 640px the pill
 * shrinks to brand + language only and primary nav moves into a fixed bottom
 * bar, so the two never duplicate the same links at once.
 */
export function Header({
  role = null,
  variant = 'full',
  patientIin,
}: {
  role?: HeaderRole;
  variant?: 'full' | 'minimal';
  patientIin?: string;
} = {}) {
  const t = useTranslations('Nav');
  const path = usePathname();
  const router = useRouter();
  const locale = useLocale();

  const profile = useUserStore((s) => s.profile);
  const hydrated = useUserStore((s) => s.hydrated);
  const clearProfile = useUserStore((s) => s.clearProfile);
  const resetOnboarding = useUserStore((s) => s.resetOnboarding);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isMinimal = variant === 'minimal' || role === null;
  const isDoctor = !isMinimal && role === 'doctor';
  const isPatient = !isMinimal && role === 'patient';

  const doctorNavItems: { href: string; label: string; icon: NavIcon }[] = [
    { href: '/', label: t('home'), icon: Home },
    { href: '/patients', label: t('patients'), icon: Users },
    { href: '/dashboard', label: t('dashboard'), icon: LineChart },
    { href: '/ai-assistant', label: t('ai'), icon: Bot },
  ];

  // A patient only ever sees their own portal — never patients/dashboard/ai-assistant/builder.
  const patientNavItems: { href: string; label: string; icon: NavIcon }[] = patientIin
    ? [
        { href: `/patient-portal/${patientIin}`, label: t('myCard'), icon: FileText },
        { href: `/patient-portal/${patientIin}/assistant`, label: t('visitAssistant'), icon: MessageCircleHeart },
      ]
    : [];

  const navItems = isDoctor ? doctorNavItems : isPatient ? patientNavItems : [];

  // Match on a full segment so /patients does not light up for /patients-archive.
  const isNavActive = (href: string) =>
    href === '/' ? path === '/' || path === '' : path === href || path.startsWith(`${href}/`);

  const handleSignOut = async () => {
    setMenuOpen(false);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Even if the call fails, send the user back to the role picker.
    }
    router.push('/patient-portal');
    router.refresh();
  };

  const initials = profile?.name
    ? profile.name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0].toUpperCase())
        .slice(0, 2)
        .join('')
    : '??';

  const languageSwitcher = (
    <div
      className="flex items-center gap-0.5 rounded-full bg-[rgba(16,32,43,0.05)] p-[3px] dark:bg-[rgba(244,247,251,0.06)]"
      role="group"
      aria-label={t('languageLabel')}
    >
      {(['ru', 'kk', 'en'] as const).map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => router.replace(path, { locale: loc })}
          aria-label={t('switchLanguage', { locale: loc.toUpperCase() })}
          data-active={loc === locale}
          className="focus-ring rounded-full px-2.5 py-[5px] text-[11px] font-bold uppercase text-[var(--text-secondary)] transition-all data-[active=true]:bg-[var(--surface)] data-[active=true]:text-[var(--text-primary)] data-[active=true]:shadow-xs"
        >
          {loc}
        </button>
      ))}
    </div>
  );

  const brand = (
    <Link
      href={isPatient && patientIin ? `/patient-portal/${patientIin}` : '/'}
      className="focus-ring flex shrink-0 items-center gap-2.5 rounded-full pr-3 transition-transform hover:scale-[1.01]"
    >
      <div className="brand-mark grid size-[30px] shrink-0 place-items-center rounded-[10px] shadow-[0_4px_12px_-2px_rgba(31,111,235,0.5)]">
        <Activity size={16} strokeWidth={2.75} />
      </div>
      <span className="hidden flex-col leading-[1.05] sm:flex">
        <span className="text-sm font-bold tracking-tight text-[var(--text-primary)]">КазМедСим</span>
        <span className="text-[10px] font-semibold tracking-wider text-[#12B5A6]">MedTech</span>
      </span>
    </Link>
  );

  const profileMenu = (isDoctor || isPatient) && (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label={t('openProfileMenu')}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className="focus-ring flex items-center gap-1 rounded-full py-1 pl-1 pr-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface)]"
      >
        {isDoctor && hydrated && profile ? (
          <span className="brand-mark grid size-7 place-items-center rounded-full text-[11px] font-bold shadow-xs">
            {initials}
          </span>
        ) : (
          <span className="grid size-7 place-items-center rounded-full bg-[rgba(18,181,166,0.12)] text-[#0E9E92]">
            <User size={14} />
          </span>
        )}
        <ChevronDown size={13} className="text-[var(--text-tertiary)]" />
      </button>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            role="menu"
            className="glass-strong absolute right-0 top-[calc(100%+10px)] w-60 p-2"
          >
            {isDoctor && hydrated && profile && (
              <div className="border-b border-[var(--border-color)] px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  {t('profile')}
                </p>
                <p className="truncate text-sm font-bold text-[var(--text-primary)]">{profile.name}</p>
              </div>
            )}

            <div className="py-1">
              {isDoctor && (
                <>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      resetOnboarding();
                      router.push('/intro');
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[rgba(18,181,166,0.1)] hover:text-[#0E7D72]"
                  >
                    <BookOpen size={15} className="text-[#12B5A6]" />
                    {t('reintro')}
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      clearProfile();
                      router.push('/');
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface)]"
                  >
                    <User size={15} className="text-[var(--text-tertiary)]" />
                    {t('changeName')}
                  </button>
                </>
              )}
              <button
                role="menuitem"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                <LogOut size={15} />
                {t('switchRole')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <>
      <div className="sticky top-3.5 z-[200] flex justify-center px-3">
        <div className="flex max-w-full items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--surface-glass)] p-1.5 pl-3.5 shadow-[var(--shadow-md)] backdrop-blur-2xl">
          <div className="flex items-center border-r border-[var(--glass-border)]">{brand}</div>

          {!isMinimal && navItems.length > 0 && (
            <nav aria-label={t('menu')} className="hidden items-center gap-0.5 min-[641px]:flex">
              {navItems.map((item) => {
                const isActive = isNavActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`focus-ring relative flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[12.5px] font-semibold transition-colors min-[1181px]:px-3.5 ${
                      isActive
                        ? 'bg-[rgba(31,111,235,0.1)] text-[#1F6FEB]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--surface)]/70 hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Icon size={14} />
                    <span className="hidden min-[1181px]:inline">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          <div className="ml-1 flex items-center gap-2 pl-2">
            {languageSwitcher}
            {profileMenu}
            {!isDoctor && !isPatient && (
              <Link
                href="/patient-portal"
                className="brand-mark focus-ring inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold shadow-[0_4px_12px_-2px_rgba(31,111,235,0.5)] transition-all hover:brightness-105"
              >
                <User size={13} />
                <span className="hidden sm:inline">{t('login')}</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile primary nav — fixed bottom bar, only when there is something to navigate to. */}
      {!isMinimal && navItems.length > 0 && (
        <nav
          data-bottomnav
          aria-label={t('menu')}
          className="fixed inset-x-0 bottom-0 z-[250] flex border-t border-[var(--glass-border)] bg-[var(--surface-glass-strong)] px-1 pb-[calc(6px+env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-10px_26px_-12px_rgba(16,32,43,0.2)] backdrop-blur-xl min-[641px]:hidden"
        >
          {navItems.map((item) => {
            const isActive = isNavActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 transition-colors ${
                  isActive ? 'text-[#1F6FEB]' : 'text-[var(--text-tertiary)]'
                }`}
              >
                <Icon size={18} />
                <span className="max-w-full truncate text-[9px] font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </>
  );
}
