'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Activity, Menu, X, User, BookOpen, LogOut, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useUserStore } from '@/stores/user-store';

export function Header() {
  const t = useTranslations('Nav');
  const path = usePathname();
  const router = useRouter();

  const profile = useUserStore((s) => s.profile);
  const hydrated = useUserStore((s) => s.hydrated);
  const clearProfile = useUserStore((s) => s.clearProfile);
  const resetOnboarding = useUserStore((s) => s.resetOnboarding);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on Escape key press
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        setDropdownOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems = [
    { href: '/', label: t('home') },
    { href: '/patients', label: t('patients') },
    { href: '/dashboard', label: t('dashboard') },
    { href: '/ai-assistant', label: t('ai') },
  ];

  // Match on a full segment so /patients does not light up for /patients-archive.
  const isNavActive = (href: string) =>
    href === '/' ? path === '/' || path === '' : path === href || path.startsWith(`${href}/`);

  // Helper to extract initials
  const initials = profile?.name
    ? profile.name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0].toUpperCase())
        .slice(0, 2)
        .join('')
    : '??';

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md transition-shadow duration-200 shadow-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand Logo */}
        <Link
          href="/"
          className="focus-ring flex items-center gap-2.5 rounded-xl transition-transform hover:scale-[1.01]"
        >
          <div className="grid size-10 place-items-center rounded-xl bg-teal-600 text-white shadow-sm shadow-teal-600/30">
            <Activity size={20} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-tight text-slate-900 leading-tight text-base">
              КазМедСим
            </span>
            <span className="text-[10px] font-semibold tracking-wider text-teal-600 uppercase">
              MedTech
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const isActive = isNavActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`focus-ring relative rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-teal-700 bg-teal-50 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-teal-600"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Controls (Lang + User Dropdown) */}
        <div className="hidden items-center gap-3 md:flex">
          {/* Language Switcher */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50/80 p-1" role="group" aria-label={t('languageLabel')}>
            {(['ru', 'kk', 'en'] as const).map((locale) => (
              <button
                key={locale}
                type="button"
                onClick={() => router.replace(path, { locale })}
                aria-label={t('switchLanguage', { locale: locale.toUpperCase() })}
                className="focus-ring rounded-lg px-2.5 py-1 text-xs font-bold uppercase text-slate-600 transition-colors hover:bg-white hover:text-teal-700 hover:shadow-xs"
              >
                {locale}
              </button>
            ))}
          </div>

          {/* User Profile / Avatar Dropdown */}
          {hydrated && profile ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-label={t('openProfileMenu')}
                aria-haspopup="menu"
                aria-expanded={dropdownOpen}
                className="focus-ring flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-xs hover:border-slate-300 hover:bg-slate-50 transition-all"
              >
                <div className="grid size-7 place-items-center rounded-lg bg-teal-700 text-xs font-bold text-white shadow-xs">
                  {initials}
                </div>
                <span className="max-w-[120px] truncate text-xs font-semibold text-slate-800">
                  {profile.name}
                </span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
                  >
                    <div className="border-b border-slate-100 px-3 py-2">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        {t('profile')}
                      </p>
                      <p className="truncate text-sm font-bold text-slate-900">
                        {profile.name}
                      </p>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          resetOnboarding();
                          router.push('/intro');
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-700 transition-colors text-left"
                      >
                        <BookOpen size={15} className="text-teal-600" />
                        {t('reintro')}
                      </button>

                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          clearProfile();
                          router.push('/');
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
                      >
                        <LogOut size={15} />
                        {t('changeName')}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link
              href="/"
              className="focus-ring inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-teal-600/20 hover:bg-teal-700 transition-all"
            >
              <User size={15} />
              {t('login')}
            </Link>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="focus-ring grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-700 md:hidden hover:bg-slate-100"
          aria-label={mobileOpen ? t('closeMenu') : t('openMenu')}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Animated Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 top-16 z-40 bg-slate-900/30 backdrop-blur-xs md:hidden"
            />

            {/* Drawer */}
            <motion.div
              id="mobile-nav"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="fixed inset-x-0 top-16 z-50 overflow-hidden border-b border-slate-200 bg-white px-4 py-6 shadow-2xl md:hidden"
            >
              <div className="flex flex-col gap-3">
                {/* User Header if logged in */}
                {hydrated && profile && (
                  <div className="flex items-center gap-3 rounded-2xl bg-teal-50/70 p-3 border border-teal-100 mb-2">
                    <div className="grid size-10 place-items-center rounded-xl bg-teal-600 font-bold text-white">
                      {initials}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        {t('greeting', { name: profile.name })}
                      </p>
                      <p className="text-sm font-bold text-teal-900">
                        {profile.name}
                      </p>
                    </div>
                  </div>
                )}

                {/* Nav Links */}
                {navItems.map((item) => {
                  const isActive = isNavActive(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`focus-ring flex items-center justify-between rounded-xl px-4 py-3 text-base font-semibold transition-colors ${
                        isActive
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{item.label}</span>
                    </Link>
                  );
                })}

                {/* Additional profile options if logged in */}
                {hydrated && profile && (
                  <div className="mt-2 grid gap-2 border-t border-slate-100 pt-3">
                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        resetOnboarding();
                        router.push('/intro');
                      }}
                      className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-xs font-semibold text-teal-800"
                    >
                      <BookOpen size={16} />
                      {t('reintro')}
                    </button>
                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        clearProfile();
                        router.push('/');
                      }}
                      className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700"
                    >
                      <LogOut size={16} />
                      {t('changeName')}
                    </button>
                  </div>
                )}

                {/* Mobile Language Switcher */}
                <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2">
                  <span className="text-xs font-medium text-slate-500 pl-2">
                    {t('languageLabel')}
                  </span>
                  <div className="flex gap-1" role="group" aria-label={t('languageLabel')}>
                    {(['ru', 'kk', 'en'] as const).map((locale) => (
                      <button
                        key={locale}
                        type="button"
                        onClick={() => {
                          setMobileOpen(false);
                          router.replace(path, { locale });
                        }}
                        aria-label={t('switchLanguage', { locale: locale.toUpperCase() })}
                        className="focus-ring rounded-lg bg-white px-3 py-1.5 text-xs font-bold uppercase text-slate-700 shadow-xs hover:text-teal-700"
                      >
                        {locale}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
