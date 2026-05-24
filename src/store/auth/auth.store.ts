import {create} from 'zustand';
import {authService} from '@services/firebase/auth.service';
import {meetingsService} from '@services/firebase/meetings.service';
import {AuthActions, AuthSlice, initialAuthSlice} from './auth.types';

type AuthStore = AuthSlice & {actions: AuthActions};

const friendlyAuthError = (e: unknown): string => {
  const msg = (e as {code?: string; message?: string})?.code ?? (e as Error)?.message ?? '';
  if (msg.includes('email-already-in-use')) return 'That email is already registered.';
  if (msg.includes('invalid-email')) return 'That email address looks invalid.';
  if (msg.includes('weak-password')) return 'Password is too weak (min 8 chars).';
  if (
    msg.includes('user-not-found') ||
    msg.includes('wrong-password') ||
    msg.includes('invalid-credential')
  )
    return 'Invalid email or password.';
  if (msg.includes('network')) return 'Network error. Check your connection and try again.';
  return 'Something went wrong. Please try again.';
};

/**
 * Auth store.
 *
 * `actions` is wrapped in a stable nested object so any component that only
 * needs the action callbacks can subscribe to `state.actions` and never
 * re-render — equivalent to the split state/dispatch context pattern, but
 * free with Zustand.
 */
export const useAuthStore = create<AuthStore>()(set => ({
  ...initialAuthSlice,

  actions: {
    signIn: async (email, password) => {
      set({busy: true});
      try {
        await authService.signIn(email, password);
        set({busy: false});
      } catch (e) {
        set({busy: false, error: friendlyAuthError(e)});
        throw e;
      }
    },

    signUp: async (email, password, displayName) => {
      set({busy: true});
      try {
        const user = await authService.signUp(email, password, displayName);
        // Auth listener can run ensureUserDoc before updateProfile completes; overwrite with final profile.
        await meetingsService.ensureUserDoc(user.uid, user.email, user.displayName).catch(() => {
          /* non-fatal — next bootstrap / listener pass will merge */
        });
        set({busy: false});
      } catch (e) {
        set({busy: false, error: friendlyAuthError(e)});
        throw e;
      }
    },

    signOut: async () => {
      set({busy: true});
      try {
        await authService.signOut();
        set({status: 'unauthenticated', user: null, busy: false, error: null});
      } catch (e) {
        set({busy: false, error: friendlyAuthError(e)});
        throw e;
      }
    },

    clearError: () => set({error: null}),

    syncSessionFromFirebase: () => {
      const mapped = authService.current();
      if (!mapped) {
        set({user: null, status: 'unauthenticated', error: null});
        return;
      }
      set({user: mapped, status: 'authenticated', error: null});
      meetingsService
        .ensureUserDoc(mapped.uid, mapped.email, mapped.displayName)
        .catch(() => {
          /* non-fatal */
        });
    },
  },
}));

/**
 * Subscribes the store to Firebase's auth state. Returns the unsubscribe
 * function. Must be called exactly once during app bootstrap.
 */
export const initAuthListener = (): (() => void) => {
  return authService.subscribe(user => {
    useAuthStore.setState({
      status: user ? 'authenticated' : 'unauthenticated',
      user,
      error: null,
    });
    if (user) {
      meetingsService
        .ensureUserDoc(user.uid, user.email, user.displayName)
        .catch(() => {
          /* non-fatal — stats fall back to zero on the client */
        });
    }
  });
};
