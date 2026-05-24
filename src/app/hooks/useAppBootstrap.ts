import {useEffect} from 'react';
import {initAuthListener, useAuthStore} from '@store/auth/auth.store';
import {bindMeetingsToUser} from '@store/meetings/meetings.store';

/**
 * Wires the two Zustand stores together with Firebase:
 *   1. Starts the Firebase auth listener once at mount.
 *   2. Re-binds the meetings + stats Firestore subscriptions whenever the
 *      authenticated user changes (sign-in, sign-out, account switch).
 */
export const useAppBootstrap = (): void => {
  useEffect(() => initAuthListener(), []);

  const userUid = useAuthStore(s => s.user?.uid);

  useEffect(() => {
    bindMeetingsToUser(userUid ?? null);
    return () => bindMeetingsToUser(null);
  }, [userUid]);
};
