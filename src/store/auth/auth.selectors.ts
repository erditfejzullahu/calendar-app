import {useAuthStore} from './auth.store';

/**
 * Granular subscriptions — each consumer only re-renders when the slice it
 * cares about changes. Prefer these over reading the whole store at once.
 */
export const useAuthUser = () => useAuthStore(s => s.user);
export const useAuthStatus = () => useAuthStore(s => s.status);
export const useAuthBusy = () => useAuthStore(s => s.busy);
export const useAuthError = () => useAuthStore(s => s.error);

/**
 * Actions live under a stable nested object, so this hook never causes a
 * re-render after the initial mount.
 */
export const useAuthActions = () => useAuthStore(s => s.actions);
