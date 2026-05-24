import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocFromServer,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  where,
} from '@react-native-firebase/firestore';
import {getFirestore} from './config';
import type {Meeting, MeetingDraft} from '@app-types/meeting';
import type {AssignableDirectoryUser, UserRole, UserStats} from '@app-types/user';
import {DEFAULT_USER_ROLE, emptyUserStats} from '@app-types/user';
import type {MeetingUserPeek, UserDocExtras} from '@store/meetings/meetings.types';
import {meetingCompositeKey} from '@shared/utils/meeting-identity';
import {isoAndHHmmToTimestamp} from '@shared/utils/time';

const db = () => getFirestore();
const usersCol = () => collection(db(), 'users');
const userDocRef = (uid: string) => doc(usersCol(), uid);
const meetingsCol = (uid: string) => collection(userDocRef(uid), 'meetings');

const buildTimestamps = (
  dateISO: string,
  startTime: string,
  endTime: string,
): {startsAt: number; endsAt: number} => ({
  startsAt: isoAndHHmmToTimestamp(dateISO, startTime),
  endsAt: isoAndHHmmToTimestamp(dateISO, endTime),
});

const parseStoredRole = (raw: unknown): UserRole | null => {
  if (raw === 'client' || raw === 'admin') return raw;
  return null;
};

const USER_MEETING_PATH_RE = /^users\/([^/]+)\/meetings\/([^/]+)$/;

const fallbackUidSnippet = (uid: string): string =>
  uid.length <= 8 ? uid : `${uid.slice(0, 6)}...`;

async function fetchMeetingUserDisplayBundleFromIds(uidList: string[]): Promise<{
  ownerHints: Record<string, string>;
  userPeekByUid: Record<string, MeetingUserPeek>;
}> {
  const uniq = [...new Set(uidList.filter(Boolean))];
  const entries = await Promise.all(
    uniq.map(async uid => {
      const snap = await getDoc(userDocRef(uid));
      const emptyPeek: MeetingUserPeek = {displayName: '', email: ''};
      if (!snap.exists()) {
        return [uid, {hint: fallbackUidSnippet(uid), peek: emptyPeek}] as const;
      }
      const d = snap.data() as {displayName?: unknown; email?: unknown};
      const displayName = typeof d.displayName === 'string' ? d.displayName.trim() : '';
      const email = typeof d.email === 'string' ? d.email.trim() : '';
      const peek: MeetingUserPeek = {displayName, email};
      const hint =
        [displayName || null, email || null].filter(Boolean).join(' · ') || fallbackUidSnippet(uid);
      return [uid, {hint, peek}] as const;
    }),
  );
  const ownerHints: Record<string, string> = {};
  const userPeekByUid: Record<string, MeetingUserPeek> = {};
  for (const [uid, {hint, peek}] of entries) {
    ownerHints[uid] = hint;
    userPeekByUid[uid] = peek;
  }
  return {ownerHints, userPeekByUid};
}

type QueryDocSnap = {
  id: string;
  ref: {path: string};
  data: () => Record<string, unknown>;
};

const participantIdsFromFirestore = (raw: Record<string, unknown>): string[] => {
  const v = raw.participantIds;
  if (!Array.isArray(v)) return [];
  const out = v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map(x => x.trim());
  return [...new Set(out)];
};

export const sanitizeParticipantIdsForPersist = (organizerUid: string, raw: string[] | undefined): string[] => {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter(id => typeof id === 'string' && id.trim() !== '').map(id => id.trim()))].filter(
    id => id !== organizerUid,
  );
};

/** Transaction `get()` target: ensures doc exists at `users/{uid}/meetings/{id}` and `ownerId` matches when stored. */
const assertTransactionalMeetingWriteSnap = (
  organizerUid: string,
  snap: {exists: () => boolean; data: () => Record<string, unknown> | undefined},
): void => {
  if (!snap.exists()) {
    throw new Error('Meeting not found.');
  }
  const data = snap.data();
  const storedOwner = typeof data?.ownerId === 'string' ? data.ownerId : '';
  if (storedOwner && storedOwner !== organizerUid) {
    throw new Error('Meeting not found.');
  }
};

const mergeDedupMeetingsAscending = (rows: Meeting[]): Meeting[] => {
  const merged = new Map<string, Meeting>();
  for (const m of rows) {
    merged.set(meetingCompositeKey(m), m);
  }
  return [...merged.values()].sort((a, b) =>
    a.startsAt !== b.startsAt ? a.startsAt - b.startsAt : a.endsAt - b.endsAt,
  );
};

/**
 * Shared deserialization for meeting docs at `users/{uid}/meetings/{meetingId}`.
 * Pass `organizerFallback` when iterating one organizer subcollection or from fetchMeetingFromServer.
 */
const meetingFromFirestore = (args: {
  id: string;
  raw: Record<string, unknown>;
  /** From collectionGroup path regex group 1 (`users/{this}/meetings`). */
  pathOwnerCandidate: string | null;
  organizerFallback?: string;
}): Meeting | null => {
  const raw = args.raw;
  const pathOwner = args.pathOwnerCandidate ?? null;
  const fallback = args.organizerFallback;
  const ownerFromField = typeof raw.ownerId === 'string' ? raw.ownerId : '';
  const ownerId = ownerFromField || pathOwner || fallback || '';
  const title = typeof raw.title === 'string' ? raw.title : '';
  const dateISO = typeof raw.dateISO === 'string' ? raw.dateISO : '';
  const startTime = typeof raw.startTime === 'string' ? raw.startTime : '';
  const endTime = typeof raw.endTime === 'string' ? raw.endTime : '';
  if (
    !ownerId ||
    typeof raw.startsAt !== 'number' ||
    typeof raw.endsAt !== 'number' ||
    typeof raw.createdAt !== 'number' ||
    typeof raw.updatedAt !== 'number'
  ) {
    return null;
  }
  const description =
    typeof raw.description === 'string' ? raw.description : raw.description === null ? null : null;

  const participantIds = participantIdsFromFirestore(raw);

  return {
    id: args.id,
    ownerId,
    participantIds,
    title,
    description,
    dateISO,
    startTime,
    endTime,
    startsAt: raw.startsAt,
    endsAt: raw.endsAt,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
};

/** Maps docs from `collectionGroup('meetings')`; drops malformed paths/data. */
const normalizeGroupedMeetingSnapshot = (d: QueryDocSnap): Meeting | null => {
  const pathMatch = USER_MEETING_PATH_RE.exec(d.ref.path);
  const ownerFromPath = pathMatch?.[1];
  const raw = d.data();
  if (!ownerFromPath) return null;
  return meetingFromFirestore({id: d.id, raw, pathOwnerCandidate: ownerFromPath});
};

export const meetingsService = {
  /**
   * One-off server read — avoids overwriting fresh UI after a write with stale collection-group snapshots.
   */
  async fetchMeetingFromServer(ownerId: string, meetingId: string): Promise<Meeting | null> {
    const ref = doc(meetingsCol(ownerId), meetingId);
    const snap = await getDocFromServer(ref);
    if (!snap.exists()) return null;
    const raw = snap.data() as Record<string, unknown>;
    return meetingFromFirestore({
      id: snap.id,
      raw,
      pathOwnerCandidate: ownerId,
      organizerFallback: ownerId,
    });
  },

  /**
   * Subscribes to all meetings for a user. We pull the whole set on purpose:
   * the calendar view groups by day across many days at once, so a single
   * snapshot listener is far more efficient than N day-scoped listeners.
   */
  subscribeAll(
    uid: string,
    onChange: (meetings: Meeting[]) => void,
    onError: (e: Error) => void,
  ): () => void {
    const q = query(meetingsCol(uid), orderBy('startsAt', 'asc'));
    return onSnapshot(q, {
      next: snap => {
        const rows = snap.docs.map(docSnap =>
          meetingFromFirestore({
            id: docSnap.id,
            raw: docSnap.data() as Record<string, unknown>,
            pathOwnerCandidate: uid,
            organizerFallback: uid,
          }),
        );
        const data = rows.filter((m): m is Meeting => m !== null);
        onChange(data);
      },
      error: err => onError(err as unknown as Error),
    });
  },

  /**
   * Invitations visible to uid (`participantIds` array-contains).
   * Sorted client-side — avoids needing a deployed composite `(participantIds, startsAt)` index
   * for collection-group queries (missing index silently broke invite calendars before).
   */
  subscribeMeetingsWhereUserIsParticipant(
    uid: string,
    onChange: (meetings: Meeting[]) => void,
    onError: (e: Error) => void,
  ): () => void {
    const q = query(collectionGroup(db(), 'meetings'), where('participantIds', 'array-contains', uid));
    return onSnapshot(q, {
      next: snap => {
        const data = snap.docs
          .map(d => normalizeGroupedMeetingSnapshot(d as QueryDocSnap))
          .filter((m): m is Meeting => m !== null)
          .sort((a, b) =>
            a.startsAt !== b.startsAt ? a.startsAt - b.startsAt : a.endsAt - b.endsAt,
          );
        onChange(data);
      },
      error: err => onError(err as unknown as Error),
    });
  },

  /**
   * Organizers calendar + bookings where someone invited this user.
   * Both streams dedupe via composite `(ownerId:id)` before emitting.
   */
  subscribeOwnMeetingsMergedWithParticipantInvites(
    uid: string,
    onChange: (meetings: Meeting[]) => void,
    onError: (e: Error) => void,
  ): () => void {
    let owned: Meeting[] = [];
    let invited: Meeting[] = [];
    let unsubscribed = false;
    /** Debounced reconnect for participant stream only (must not wipe last good invite list). */
    let inviteReconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const emit = (): void => {
      if (unsubscribed) return;
      onChange(mergeDedupMeetingsAscending([...owned, ...invited]));
    };

    let unsubOwned: (() => void) | null = null;
    let unsubInvited: (() => void) | null = null;

    const failOwned = (e: Error): void => {
      if (unsubscribed) return;
      unsubscribed = true;
      if (inviteReconnectTimer) clearTimeout(inviteReconnectTimer);
      unsubOwned?.();
      unsubInvited?.();
      unsubOwned = null;
      unsubInvited = null;
      onError(e);
    };

    unsubOwned = meetingsService.subscribeAll(
      uid,
      rows => {
        owned = rows;
        emit();
      },
      failOwned,
    );

    const scheduleParticipantReconnect = (): void => {
      if (unsubscribed) return;
      if (inviteReconnectTimer !== null) return;
      inviteReconnectTimer = setTimeout(() => {
        inviteReconnectTimer = null;
        attachParticipantListener();
      }, 5000);
    };

    const attachParticipantListener = (): void => {
      if (unsubscribed) return;
      if (inviteReconnectTimer !== null) {
        clearTimeout(inviteReconnectTimer);
        inviteReconnectTimer = null;
      }
      unsubInvited?.();
      unsubInvited = null;

      unsubInvited = meetingsService.subscribeMeetingsWhereUserIsParticipant(
        uid,
        rows => {
          invited = rows;
          emit();
        },
        () => {
          unsubInvited?.();
          unsubInvited = null;
          /** Keep prior `invited` so the calendar does not flash empty on transient SDK/network errors. */
          if (!unsubscribed) scheduleParticipantReconnect();
        },
      );
    };

    attachParticipantListener();

    return () => {
      unsubscribed = true;
      if (inviteReconnectTimer) clearTimeout(inviteReconnectTimer);
      unsubOwned?.();
      unsubInvited?.();
    };
  },

  subscribeUsersDirectory(
    onChange: (users: AssignableDirectoryUser[]) => void,
    onError: (e: Error) => void,
  ): () => void {
    return onSnapshot(usersCol(), {
      next: snap => {
        const mapped: AssignableDirectoryUser[] = snap.docs.map(ds => {
          const raw = ds.data() as {email?: unknown; displayName?: unknown};
          const emailPart = typeof raw.email === 'string' ? raw.email.trim() : '';
          const dn = typeof raw.displayName === 'string' ? raw.displayName.trim() : '';
          return {
            uid: ds.id,
            email: emailPart,
            displayName: dn,
          };
        });
        mapped.sort((a, b) => {
          const la = `${a.displayName}${a.email}`.toLocaleLowerCase();
          const lb = `${b.displayName}${b.email}`.toLocaleLowerCase();
          return la.localeCompare(lb);
        });
        onChange(mapped);
      },
      error: err => onError(err as unknown as Error),
    });
  },

  /**
   * Stream all docs from the Firestore collection group named `meetings`
   * (every path users/{uid}/meetings/{id}).
   * Deploy a composite index: collection group `meetings`, field startsAt ascending.
   */
  subscribeMeetingsAcrossAllUsers(
    onChange: (meetings: Meeting[]) => void,
    onError: (e: Error) => void,
  ): () => void {
    const q = query(collectionGroup(db(), 'meetings'), orderBy('startsAt', 'asc'));
    return onSnapshot(q, {
      next: snap => {
        const data = snap.docs
          .map(d => normalizeGroupedMeetingSnapshot(d as QueryDocSnap))
          .filter((m): m is Meeting => m !== null);
        onChange(data);
      },
      error: err => onError(err as unknown as Error),
    });
  },

  /**
   * Loads `/users/{uid}` name + email for attendee detail rows plus compact subtitle strings (`ownerHints`).
   */
  async fetchMeetingUserDisplayBundle(uidList: string[]): Promise<{
    ownerHints: Record<string, string>;
    userPeekByUid: Record<string, MeetingUserPeek>;
  }> {
    return fetchMeetingUserDisplayBundleFromIds(uidList);
  },

  /** Back-compat: compact labels only (admin day rows, subtitles). */
  async fetchOwnerDisplayHints(uidList: string[]): Promise<Record<string, string>> {
    const bundle = await fetchMeetingUserDisplayBundleFromIds(uidList);
    return bundle.ownerHints;
  },

  subscribeUserDocument(
    uid: string,
    onChange: (extras: UserDocExtras) => void,
    onError: (e: Error) => void,
  ): () => void {
    return onSnapshot(userDocRef(uid), {
      next: snap => {
        const data = snap.data() as
          | {
              stats?: Partial<UserStats>;
              role?: unknown;
            }
          | undefined;
        const s = data?.stats;
        const stats: UserStats = {
          meetingsCreated: s?.meetingsCreated ?? 0,
          meetingsEdited: s?.meetingsEdited ?? 0,
          meetingsDeleted: s?.meetingsDeleted ?? 0,
        };
        const userRole = parseStoredRole(data?.role);
        onChange({stats, userRole});
      },
      error: err => onError(err as unknown as Error),
    });
  },

  /**
   * Creates or merges Firestore profile: stats, mirrored auth fields, and `role: client`.
   */
  async ensureUserDoc(
    uid: string,
    email: string | null,
    displayName: string | null,
  ): Promise<void> {
    const ref = userDocRef(uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        email,
        displayName,
        stats: emptyUserStats(),
        role: DEFAULT_USER_ROLE,
        createdAt: Date.now(),
      });
      return;
    }

    const data = snap.data() as {role?: unknown} | undefined;
    const needsRoleBackfill =
      data?.role !== 'client' && data?.role !== 'admin';
    await setDoc(
      ref,
      {
        email,
        displayName,
        ...(needsRoleBackfill ? {role: DEFAULT_USER_ROLE} : {}),
      },
      {merge: true},
    );
  },

  async create(uid: string, draft: MeetingDraft): Promise<Meeting> {
    const now = Date.now();
    const {startsAt, endsAt} = buildTimestamps(draft.dateISO, draft.startTime, draft.endTime);

    const ref = doc(meetingsCol(uid));
    const participantIds = sanitizeParticipantIdsForPersist(uid, draft.participantIds);

    const meeting: Meeting = {
      id: ref.id,
      ownerId: uid,
      participantIds,
      title: draft.title.trim(),
      description: draft.description?.trim() || null,
      dateISO: draft.dateISO,
      startTime: draft.startTime,
      endTime: draft.endTime,
      startsAt,
      endsAt,
      createdAt: now,
      updatedAt: now,
    };

    await runTransaction(db(), async tx => {
      tx.set(ref, meeting);
      tx.set(
        userDocRef(uid),
        {stats: {meetingsCreated: increment(1)}},
        {merge: true},
      );
    });
    return meeting;
  },

  async update(uid: string, id: string, draft: MeetingDraft): Promise<void> {
    const {startsAt, endsAt} = buildTimestamps(draft.dateISO, draft.startTime, draft.endTime);
    const participantIds = sanitizeParticipantIdsForPersist(uid, draft.participantIds);
    const ref = doc(meetingsCol(uid), id);
    const updatedAt = Date.now();

    await runTransaction(db(), async tx => {
      const snap = await tx.get(ref);
      assertTransactionalMeetingWriteSnap(uid, snap);

      tx.update(ref, {
        title: draft.title.trim(),
        description: draft.description?.trim() || null,
        dateISO: draft.dateISO,
        startTime: draft.startTime,
        endTime: draft.endTime,
        participantIds,
        startsAt,
        endsAt,
        updatedAt,
      });
      tx.set(
        userDocRef(uid),
        {stats: {meetingsEdited: increment(1)}},
        {merge: true},
      );
    });
  },

  async remove(uid: string, id: string): Promise<void> {
    const ref = doc(meetingsCol(uid), id);

    await runTransaction(db(), async tx => {
      const snap = await tx.get(ref);
      assertTransactionalMeetingWriteSnap(uid, snap);

      tx.delete(ref);
      tx.set(
        userDocRef(uid),
        {stats: {meetingsDeleted: increment(1)}},
        {merge: true},
      );
    });
  },
};
