import {useMemo} from 'react';
import type {Meeting} from '@app-types/meeting';
import {useAuthStore} from '@store/auth/auth.store';
import {useMeetingsStore} from './meetings.store';

/**
 * Granular state slices — each hook subscribes to exactly one root field on
 * the store so React only re-renders when that field's reference changes.
 * Derived computations are then memoized client-side with useMemo, keeping
 * the store free of cached/derived state.
 */

/** Stable accessor for the action callbacks; never re-renders consumers. */
export const useMeetingsActions = () => useMeetingsStore(s => s.actions);

/** Firestore `users/{uid}.role` (see `meetings.ensureUserDoc`). */
export const useUserRole = () => useMeetingsStore(s => s.userRole);

export const useMeetingsLoading = () => useMeetingsStore(s => s.loading);
export const useMeetingsError = () => useMeetingsStore(s => s.error);

/** All meetings on a given dateISO, sorted by start time. */
export const useMeetingsForDay = (dateISO: string): Meeting[] => {
  const byDate = useMeetingsStore(s => s.byDate);
  const byId = useMeetingsStore(s => s.byId);
  return useMemo(() => {
    const ids = byDate[dateISO] ?? [];
    return ids.map(id => byId[id]).filter(Boolean);
  }, [byDate, byId, dateISO]);
};

/** Count of meetings per day, for badging the calendar grid. */
export const useMeetingCountsByDate = (): Record<string, number> => {
  const byDate = useMeetingsStore(s => s.byDate);
  return useMemo(() => {
    const out: Record<string, number> = {};
    for (const k in byDate) out[k] = byDate[k].length;
    return out;
  }, [byDate]);
};

export const useUpcomingMeetings = (limit: number = 5): Meeting[] => {
  const uid = useAuthStore(s => s.user?.uid);
  const order = useMeetingsStore(s => s.order);
  const byId = useMeetingsStore(s => s.byId);
  return useMemo(() => {
    const now = Date.now();
    const result: Meeting[] = [];
    for (const id of order) {
      const m = byId[id];
      if (m && m.startsAt >= now && (!uid || m.ownerId === uid)) {
        result.push(m);
        if (result.length >= limit) break;
      }
    }
    return result;
  }, [order, byId, limit, uid]);
};

export const useUpcomingCount = (): number => {
  const uid = useAuthStore(s => s.user?.uid);
  const order = useMeetingsStore(s => s.order);
  const byId = useMeetingsStore(s => s.byId);
  return useMemo(() => {
    const now = Date.now();
    let n = 0;
    for (const id of order) {
      const m = byId[id];
      if (m && m.startsAt >= now && (!uid || m.ownerId === uid)) {
        n++;
      }
    }
    return n;
  }, [order, byId, uid]);
};

export const useMeetingStats = () => {
  const stats = useMeetingsStore(s => s.stats);
  const upcoming = useUpcomingCount();
  return useMemo(
    () => ({
      created: stats.meetingsCreated,
      edited: stats.meetingsEdited,
      deleted: stats.meetingsDeleted,
      upcoming,
    }),
    [stats, upcoming],
  );
};
