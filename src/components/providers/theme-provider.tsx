'use client';

import { useEffect } from 'react';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Default to light theme regardless of system preference.
    const saved = localStorage.getItem('kms-theme');
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('kms-theme', 'light');
    }
  }, []);

  return <>{children}</>;
}
