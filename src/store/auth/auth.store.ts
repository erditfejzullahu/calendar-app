import {create} from 'zustand';
import {authService} from '@services/firebase/auth.service';
import {meetingsService} from '@services/firebase/meetings.service';
import {AuthActions, AuthSlice, initialAuthSlice} from './auth.types';

type AuthStore = AuthSlice & {actions: AuthActions};

const friendlyAuthError = (e: unknown): string => {
  const msg = (e as {code?: string; message?: string})?.code ?? (e as Error)?.message ?? '';
  if (msg.includes('email-already-in-use')) return 'That email is already registered.';
  if (msg.includes('invalid-email') || msg.includes('missing-email'))
    return 'That email address looks invalid.';
  if (msg.includes('weak-password'))
    return 'Password is too weak. Use at least 8 characters with upper and lowercase letters, a number, and a symbol.';
  if (msg.includes('user-disabled'))
    return 'This account has been disabled. Contact support if you need help.';
  if (msg.includes('too-many-requests'))
    return 'Too many attempts. Wait a minute and try again.';
  if (msg.includes('operation-not-allowed'))
    return 'Email/password sign-in is not enabled for this app.';
  if (msg.includes('credential-already-in-use'))
    return 'That sign-in method is already linked to another account.';
  if (msg.includes('account-exists-with-different-credential'))
    return 'An account already exists with this email using a different sign-in method.';
  if (msg.includes('requires-recent-login'))
    return 'For security, sign out and sign in again, then retry.';
  if (msg.includes('user-token-expired') || msg.includes('invalid-user-token'))
    return 'Your session expired. Please sign in again.';
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

    syncSessionFromFirebase: async () => {
      const mapped = authService.current();
      if (!mapped) {
        set({user: null, status: 'unauthenticated', error: null});
        return;
      }
      set({user: mapped, status: 'authenticated', error: null});
      try {
        await meetingsService.ensureUserDoc(mapped.uid, mapped.email, mapped.displayName);
      } catch (e) {
        console.error('Error ensuring user doc', e);
      } finally {
        set({busy: false});
      }
    },
  },
}));

/**
 * Subscribes the store to Firebase's auth state. Returns the unsubscribe
 * function. Must be called exactly once during app bootstrap.
 */
export const initAuthListener = (): (() => void) => {
  return authService.subscribe(async user => {
    useAuthStore.setState({
      status: user ? 'authenticated' : 'unauthenticated',
      user,
      error: null,
    });
    if (user) {
      try {
        await meetingsService.ensureUserDoc(user.uid, user.email, user.displayName);
      } catch (e) {
        console.error('Error ensuring user doc', e);
      } finally {
        useAuthStore.setState({busy: false});
      }
    }
  });
};
