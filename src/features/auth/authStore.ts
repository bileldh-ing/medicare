import { create } from 'zustand';

// Side-effect imports: make sure every per-user store is registered before switching user.
import '@/features/appointments/appointmentsStore';
import '@/features/doctors/bookmarksStore';
import '@/features/doctors/recentSearchesStore';
import '@/features/messages/messagesStore';
import { switchActiveUser } from '@/features/session/scopedStores';

import { authService } from './authClient';
import type { AuthResult, ProfilePatch, PublicUser, SignInInput, SignUpInput } from './authService';

export type AuthStatus = 'booting' | 'signedOut' | 'signedIn';

export interface CommitOptions {
  onVerified?: () => void;
  commitDelayMs?: number;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface AuthState {
  status: AuthStatus;
  user: PublicUser | null;
  /** True once the session check and per-user store hydration finished. */
  hasHydrated: boolean;
  /** Set right after sign-up so Home can play the welcome animation once. */
  justSignedUp: boolean;
  bootstrap: () => Promise<void>;
  /**
   * `onVerified` fires as soon as credentials are accepted; the route change is then
   * delayed by `commitDelayMs` so the button can show its success check first.
   */
  signIn: (input: SignInInput, opts?: CommitOptions) => Promise<PublicUser>;
  signUp: (input: SignUpInput, opts?: CommitOptions) => Promise<PublicUser>;
  continueAsGuest: () => Promise<PublicUser>;
  signOut: () => Promise<void>;
  updateProfile: (patch: ProfilePatch) => Promise<PublicUser>;
  changePassword: (current: string, next: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  consumeWelcome: () => void;
}

async function activate(result: AuthResult) {
  await switchActiveUser(result.user.id);
  return result.user;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  status: 'booting',
  user: null,
  hasHydrated: false,
  justSignedUp: false,

  bootstrap: async () => {
    try {
      const result = await authService.getSession();
      if (result) {
        await activate(result);
        set({ status: 'signedIn', user: result.user, hasHydrated: true });
        return;
      }
    } catch {
      // Corrupted session/storage: fall through to signed-out instead of crashing.
    }
    await switchActiveUser(null);
    set({ status: 'signedOut', user: null, hasHydrated: true });
  },

  signIn: async (input, opts) => {
    const result = await authService.signIn(input);
    opts?.onVerified?.();
    const user = await activate(result);
    if (opts?.commitDelayMs) await wait(opts.commitDelayMs);
    set({ status: 'signedIn', user, justSignedUp: false });
    return user;
  },

  signUp: async (input, opts) => {
    const result = await authService.signUp(input);
    opts?.onVerified?.();
    const user = await activate(result);
    if (opts?.commitDelayMs) await wait(opts.commitDelayMs);
    set({ status: 'signedIn', user, justSignedUp: true });
    return user;
  },

  continueAsGuest: async () => {
    const result = await authService.signInAsGuest();
    const user = await activate(result);
    set({ status: 'signedIn', user, justSignedUp: false });
    return user;
  },

  signOut: async () => {
    await authService.signOut();
    await switchActiveUser(null);
    set({ status: 'signedOut', user: null, justSignedUp: false });
  },

  updateProfile: async (patch) => {
    const u = get().user;
    if (!u) throw new Error('Not signed in');
    const user = await authService.updateProfile(u.id, patch);
    set({ user });
    return user;
  },

  changePassword: async (current, next) => {
    const u = get().user;
    if (!u) throw new Error('Not signed in');
    await authService.changePassword(u.id, current, next);
  },

  deleteAccount: async () => {
    const u = get().user;
    if (!u) return;
    await switchActiveUser(null);
    await authService.deleteAccount(u.id);
    set({ status: 'signedOut', user: null, justSignedUp: false });
  },

  consumeWelcome: () => set({ justSignedUp: false }),
}));
