import type {Meeting, MeetingDraft} from '@app-types/meeting';
import type {UserRole, UserStats} from '@app-types/user';
import {emptyUserStats} from '@app-types/user';

/** Snapshot fields from Firestore user doc beside meetings. */
export type UserDocExtras = {
  stats: UserStats;
  /** `users/{uid}.role` — mirrored from Auth + Firestore. */
  userRole: UserRole | null;
};

export type MeetingsSlice = {
  byId: Record<string, Meeting>;
  /** Ordered list of meeting composite keys `(ownerId:id)` ascending by startsAt. */
  order: string[];
  /** Pre-built index dateISO -> ordered composite keys on that day. */
  byDate: Record<string, string[]>;
  stats: UserStats;
  userRole: UserRole | null;
  /** Admin-only calendar: when true + role admin, stream all users’ meetings via collectionGroup. */
  adminCalendarShowAllGlobal: boolean;
  /** Resolved labels keyed by Firebase uid (admin roster). */
  ownerHints: Record<string, string>;
  loading: boolean;
  error: string | null;
};

export type MeetingsActions = {
  createMeeting: (draft: MeetingDraft) => Promise<Meeting>;
  updateMeeting: (target: Pick<Meeting, 'id' | 'ownerId'>, draft: MeetingDraft) => Promise<void>;
  deleteMeeting: (target: Pick<Meeting, 'id' | 'ownerId'>) => Promise<void>;
  /** Drops and recreates realtime listeners — pull-to-refresh on calendar/profile. */
  refresh: () => void;
  /** Persisted toggle for admins; silently no-ops for non-admins. */
  setAdminCalendarShowAll: (showAll: boolean) => void;
};

/**
 * Internal mutators called by the firebase subscription bridge. Kept off the
 * public actions surface so feature code cannot misuse them.
 */
export type MeetingsInternal = {
  _hydrateMeetings: (meetings: Meeting[]) => void;
  /** Merge/replace one meeting in indexes (caller usually reads from server after a write). */
  _mergeMeetingIntoIndex: (meeting: Meeting) => void;
  _removeMeetingFromIndex: (target: Pick<Meeting, 'id' | 'ownerId'>) => void;
  _hydrateUserExtras: (extras: UserDocExtras) => void;
  _setLoading: (loading: boolean) => void;
  _setError: (error: string | null) => void;
  _reset: () => void;
};

export const initialMeetingsSlice: MeetingsSlice = {
  byId: {},
  order: [],
  byDate: {},
  stats: emptyUserStats(),
  userRole: null,
  adminCalendarShowAllGlobal: false,
  ownerHints: {},
  loading: false,
  error: null,
};
