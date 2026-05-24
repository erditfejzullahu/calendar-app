import type {AuthUser} from '@app-types/user';

export type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated';

export type AuthSlice = {
  status: AuthStatus;
  user: AuthUser | null;
  error: string | null;
  busy: boolean;
};

export type AuthActions = {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  /**
   * Re-read Firebase Auth session into Zustand. Needed after profile/reload —
   * `onAuthStateChanged` often does not fire when only profile fields update.
   */
  syncSessionFromFirebase: () => void;
};

export const initialAuthSlice: AuthSlice = {
  status: 'initializing',
  user: null,
  error: null,
  busy: false,
};
