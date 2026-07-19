import { describe, expect, it, beforeEach } from 'vitest';
import { useUserStore, USER_STORE_VERSION } from '@/stores/user-store';

describe('UserStore', () => {
  beforeEach(() => {
    useUserStore.getState().clearProfile();
  });

  it('should initialize with schema version 1 and null profile', () => {
    const state = useUserStore.getState();
    expect(state.version).toBe(USER_STORE_VERSION);
    expect(state.profile).toBeNull();
  });

  it('should save trimmed user name correctly', () => {
    useUserStore.getState().setName('  Д-р Касымова  ');
    const profile = useUserStore.getState().profile;

    expect(profile).not.toBeNull();
    expect(profile?.name).toBe('Д-р Касымова');
    expect(profile?.onboardingCompleted).toBe(false);
    expect(profile?.onboardingStep).toBe(0);
  });

  it('should not update profile if name is empty', () => {
    useUserStore.getState().setName('   ');
    expect(useUserStore.getState().profile).toBeNull();
  });

  it('should track onboarding step and completion status', () => {
    useUserStore.getState().setName('Алихан');
    
    useUserStore.getState().setOnboardingStep(2);
    expect(useUserStore.getState().profile?.onboardingStep).toBe(2);
    expect(useUserStore.getState().profile?.onboardingCompleted).toBe(false);

    useUserStore.getState().setOnboardingCompleted(true);
    expect(useUserStore.getState().profile?.onboardingCompleted).toBe(true);
  });

  it('should reset onboarding state while preserving user name', () => {
    useUserStore.getState().setName('Динара');
    useUserStore.getState().setOnboardingCompleted(true);
    useUserStore.getState().setOnboardingStep(3);

    useUserStore.getState().resetOnboarding();

    const profile = useUserStore.getState().profile;
    expect(profile?.name).toBe('Динара');
    expect(profile?.onboardingCompleted).toBe(false);
    expect(profile?.onboardingStep).toBe(0);
  });

  it('should clear profile completely', () => {
    useUserStore.getState().setName('Аскар');
    useUserStore.getState().clearProfile();
    expect(useUserStore.getState().profile).toBeNull();
  });
});
