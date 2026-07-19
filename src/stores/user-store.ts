'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { localAuthProvider } from '@/auth/auth-provider';

export interface UserProfile {
  name: string;
  onboardingCompleted: boolean;
  onboardingStep: number;
}

interface UserState {
  version: number;
  profile: UserProfile | null;
  hydrated: boolean;
  setHydrated: (state: boolean) => void;
  setName: (name: string) => void;
  setOnboardingCompleted: (completed: boolean) => void;
  setOnboardingStep: (step: number) => void;
  resetOnboarding: () => void;
  clearProfile: () => void;
}

export const USER_STORE_VERSION = 1;

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      version: USER_STORE_VERSION,
      profile: null,
      hydrated: false,
      setHydrated: (hydrated: boolean) => set({ hydrated }),
      setName: (rawName: string) => {
        const name = rawName.trim();
        if (!name) return;

        const currentProfile = get().profile;
        const updatedProfile: UserProfile = {
          name,
          onboardingCompleted: currentProfile?.onboardingCompleted ?? false,
          onboardingStep: currentProfile?.onboardingStep ?? 0,
        };

        set({ profile: updatedProfile });
        // Sync with legacy auth provider
        localAuthProvider.signIn(name).catch(() => {});
      },

      setOnboardingCompleted: (completed: boolean) => {
        const currentProfile = get().profile;
        if (!currentProfile) return;
        set({
          profile: {
            ...currentProfile,
            onboardingCompleted: completed,
          },
        });
      },

      setOnboardingStep: (step: number) => {
        const currentProfile = get().profile;
        if (!currentProfile) return;
        set({
          profile: {
            ...currentProfile,
            onboardingStep: step,
          },
        });
      },

      resetOnboarding: () => {
        const currentProfile = get().profile;
        if (!currentProfile) return;
        set({
          profile: {
            ...currentProfile,
            onboardingCompleted: false,
            onboardingStep: 0,
          },
        });
      },

      clearProfile: () => {
        set({ profile: null });
        localAuthProvider.signOut().catch(() => {});
      },
    }),
    {
      name: 'kms-user-profile-v1',
      version: USER_STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
