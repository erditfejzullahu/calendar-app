import {create} from 'zustand';
import {meetingsService} from '@services/firebase/meetings.service';
import type {Meeting} from '@app-types/meeting';
import {meetingCompositeKey} from '@shared/utils/meeting-identity';
import {useAuthStore} from '@store/auth/auth.store';
import {
  MeetingsActions,
  MeetingsInternal,
  MeetingsSlice,
  initialMeetingsSlice,
} from './meetings.types';

type MeetingsStore = MeetingsSlice & {
  actions: MeetingsActions;
  internal: MeetingsInternal;
};

const buildIndexes = (meetings: Meeting[]) => {
  const sorted = [...meetings].sort((a, b) => a.startsAt - b.startsAt);
  const byId: Record<string, Meeting> = {};
  const byDate: Record<string, string[]> = {};
  const order: string[] = [];
  for (const m of sorted) {
    const key = meetingCompositeKey(m);
    byId[key] = m;
    order.push(key);
    (byDate[m.dateISO] ||= []).push(key);
  }
  return {byId, order, byDate};
};

const requireUid = (): string => {
  const uid = useAuthStore.getState().user?.uid;
  if (!uid) throw new Error('Not authenticated');
  return uid;
};

const assertMeetingWriteAllowed = (
  organizerUid: string,
  viewerUid: string,
  viewerRole: MeetingsSlice['userRole'],
): void => {
  if (organizerUid === viewerUid) return;
  if (viewerRole === 'admin') return;
  throw new Error('Only the organizer or an admin can modify this meeting.');
};

let unsubMeetings: (() => void) | null = null;
let unsubStats: (() => void) | null = null;
let lastMeetingWireSig = '';

/** Drop stale snaps that resurrect a deleted row (common with collection-group cache). */
const suppressedDeleteMeetingKeys = new Set<string>();

const prefetchUserDisplayHints = async (meetings: Meeting[]): Promise<void> => {
  if (meetings.length === 0) return;

  const {ownerHints, userPeekByUid} = useMeetingsStore.getState();

  const uidsNeedingLabels = new Set<string>();
  for (const m of meetings) {
    uidsNeedingLabels.add(m.ownerId);
    for (const p of m.participantIds ?? []) {
      if (p) uidsNeedingLabels.add(p);
    }
  }

  const missing = [...uidsNeedingLabels].filter(
    uid => !(uid in ownerHints) || !(uid in userPeekByUid),
  );
  if (missing.length === 0) return;

  try {
    const bundle = await meetingsService.fetchMeetingUserDisplayBundle(missing);
    useMeetingsStore.setState(s => ({
      ownerHints: {...s.ownerHints, ...bundle.ownerHints},
      userPeekByUid: {...s.userPeekByUid, ...bundle.userPeekByUid},
    }));
  } catch {
    /* labels are purely cosmetic */
  }
};

/** Recreates ONLY the meetings listener when uid / scope / admin role changes materially. */
const wireMeetingsListener = (): void => {
  const uid = useAuthStore.getState().user?.uid;
  if (!uid) {
    unsubMeetings?.();
    unsubMeetings = null;
    lastMeetingWireSig = '';
    return;
  }

  const {internal, userRole, adminCalendarShowAllGlobal} = useMeetingsStore.getState();
  const globalScope = userRole === 'admin' && adminCalendarShowAllGlobal;

  const sig = `${uid}|${userRole ?? 'null'}|${globalScope ? 'all' : 'own'}`;
  if (sig === lastMeetingWireSig && unsubMeetings !== null) return;

  unsubMeetings?.();
  unsubMeetings = null;
  lastMeetingWireSig = sig;

  if (!globalScope) {
    useMeetingsStore.setState({ownerHints: {}, userPeekByUid: {}});
  }

  internal._setLoading(true);

  const onMeetings = (meetings: Meeting[]) => {
    internal._hydrateMeetings(meetings);
    void prefetchUserDisplayHints(meetings);
  };

  unsubMeetings = globalScope
    ? meetingsService.subscribeMeetingsAcrossAllUsers(onMeetings, err =>
        internal._setError(err.message),
      )
    : meetingsService.subscribeOwnMeetingsMergedWithParticipantInvites(uid, onMeetings, err =>
        internal._setError(err.message),
      );
};

export const useMeetingsStore = create<MeetingsStore>()((set, get) => ({
  ...initialMeetingsSlice,

  actions: {
    createMeeting: async draft => {
      const m = await meetingsService.create(requireUid(), draft);
      get().internal._mergeMeetingIntoIndex(m);
      return m;
    },
    updateMeeting: async (target, draft) => {
      const viewer = requireUid();
      assertMeetingWriteAllowed(target.ownerId, viewer, get().userRole);
      await meetingsService.update(target.ownerId, target.id, draft);
      const fresh = await meetingsService.fetchMeetingFromServer(target.ownerId, target.id);
      if (fresh) get().internal._mergeMeetingIntoIndex(fresh);
    },
    deleteMeeting: async target => {
      const viewer = requireUid();
      assertMeetingWriteAllowed(target.ownerId, viewer, get().userRole);
      await meetingsService.remove(target.ownerId, target.id);
      suppressedDeleteMeetingKeys.add(meetingCompositeKey(target));
      get().internal._removeMeetingFromIndex(target);
    },

    refresh: () => {
      const uid = useAuthStore.getState().user?.uid ?? null;
      if (!uid) return;
      queueMicrotask(() => {
        lastMeetingWireSig = '';
        wireMeetingsListener();
      });
    },

    setAdminCalendarShowAll: showAll => {
      const role = get().userRole;
      const safe = role === 'admin' && showAll;
      set({adminCalendarShowAllGlobal: safe});
      queueMicrotask(() => wireMeetingsListener());
    },

    prefetchUserProfilesForMeetings: meetings => {
      void prefetchUserDisplayHints(meetings);
    },
  },

  internal: {
    _hydrateMeetings: meetings => {
      set(state => {
        const incomingKeys = new Set(meetings.map(m => meetingCompositeKey(m)));

        suppressedDeleteMeetingKeys.forEach(k => {
          if (!incomingKeys.has(k)) {
            suppressedDeleteMeetingKeys.delete(k);
          }
        });

        const visible = meetings.filter(
          m => !suppressedDeleteMeetingKeys.has(meetingCompositeKey(m)),
        );

        const merged = visible.map(m => {
          const k = meetingCompositeKey(m);
          const prev = state.byId[k];
          return !prev || m.updatedAt >= prev.updatedAt ? m : prev;
        });

        return {
          ...buildIndexes(merged),
          loading: false,
          error: null,
          meetingsInitialHydrated: true,
        };
      });
    },
    _mergeMeetingIntoIndex: meeting => {
      set(state => {
        const key = meetingCompositeKey(meeting);
        const list = (state.order.map(k => state.byId[k]).filter(Boolean) as Meeting[]).filter(
          m => meetingCompositeKey(m) !== key,
        );
        list.push(meeting);
        return {
          ...buildIndexes(list),
          loading: state.loading,
          error: state.error,
          meetingsInitialHydrated: true,
        };
      });
      void prefetchUserDisplayHints([meeting]);
    },
    _removeMeetingFromIndex: target => {
      set(state => {
        const key = meetingCompositeKey(target);
        const list = (state.order.map(k => state.byId[k]).filter(Boolean) as Meeting[]).filter(
          m => meetingCompositeKey(m) !== key,
        );
        return {...buildIndexes(list), loading: state.loading, error: state.error};
      });
    },
    _hydrateUserExtras: extras => {
      set({
        stats: extras.stats,
        userRole: extras.userRole,
        ...(extras.userRole !== 'admin'
          ? {adminCalendarShowAllGlobal: false, ownerHints: {}, userPeekByUid: {}}
          : {}),
      });
      queueMicrotask(() => wireMeetingsListener());
    },
    _setLoading: loading => set({loading}),
    _setError: error =>
      set({error, loading: false, meetingsInitialHydrated: true}),
    _reset: () => {
      suppressedDeleteMeetingKeys.clear();
      set({...initialMeetingsSlice});
    },
  },
}));

/**
 * Per-user subscription manager. Living at module scope means we can
 * tear down listeners on sign-out without leaking React effects.
 */
export const bindMeetingsToUser = (uid: string | null): void => {
  unsubMeetings?.();
  unsubStats?.();
  unsubMeetings = null;
  unsubStats = null;
  lastMeetingWireSig = '';

  const {internal} = useMeetingsStore.getState();

  if (!uid) {
    internal._reset();
    return;
  }

  suppressedDeleteMeetingKeys.clear();

  internal._setLoading(true);
  useMeetingsStore.setState({meetingsInitialHydrated: false});
  unsubStats = meetingsService.subscribeUserDocument(uid, internal._hydrateUserExtras, () => {
    /* stats are non-critical */
  });

  wireMeetingsListener();
};
