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
  setDoc,
  writeBatch,
} from '@react-native-firebase/firestore';
import {getFirestore} from './config';
import type {Meeting, MeetingDraft} from '@app-types/meeting';
import type {UserRole, UserStats} from '@app-types/user';
import {DEFAULT_USER_ROLE, emptyUserStats} from '@app-types/user';
import type {UserDocExtras} from '@store/meetings/meetings.types';
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

type QueryDocSnap = {
  id: string;
  ref: {path: string};
  data: () => Record<string, unknown>;
};

/** Maps docs from `collectionGroup('meetings')`; drops malformed paths/data. */
const normalizeGroupedMeetingSnapshot = (d: QueryDocSnap): Meeting | null => {
  const pathMatch = USER_MEETING_PATH_RE.exec(d.ref.path);
  const ownerFromPath = pathMatch?.[1];
  const raw = d.data();
  const ownerIdRaw = raw.ownerId;
  const ownerId =
    typeof ownerIdRaw === 'string'
      ? ownerIdRaw
      : typeof ownerFromPath === 'string'
        ? ownerFromPath
        : '';
  const title = typeof raw.title === 'string' ? raw.title : '';
  const dateISO = typeof raw.dateISO === 'string' ? raw.dateISO : '';
  const startTime = typeof raw.startTime === 'string' ? raw.startTime : '';
  const endTime = typeof raw.endTime === 'string' ? raw.endTime : '';
  if (
    !ownerFromPath ||
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
  return {
    id: d.id,
    ownerId,
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

export const meetingsService = {
  /**
   * One-off server read — avoids overwriting fresh UI after a write with stale collection-group snapshots.
   */
  async fetchMeetingFromServer(ownerId: string, meetingId: string): Promise<Meeting | null> {
    const ref = doc(meetingsCol(ownerId), meetingId);
    const snap = await getDocFromServer(ref);
    if (!snap.exists()) return null;
    return {
      id: snap.id,
      ...(snap.data() as Omit<Meeting, 'id'>),
    } as Meeting;
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
        const data = snap.docs.map(
          docSnap =>
            ({
              id: docSnap.id,
              ...(docSnap.data() as Omit<Meeting, 'id'>),
            }) as Meeting,
        );
        onChange(data);
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

  /** Display strings for organizer labels in the admin "all meetings" view. */
  async fetchOwnerDisplayHints(uidList: string[]): Promise<Record<string, string>> {
    const uniq = [...new Set(uidList.filter(Boolean))];
    const pairs = await Promise.all(
      uniq.map(async uid => {
        const snap = await getDoc(userDocRef(uid));
        if (!snap.exists()) {
          const short = uid.length <= 8 ? uid : `${uid.slice(0, 6)}...`;
          return [uid, short] as const;
        }
        const d = snap.data() as {displayName?: unknown; email?: unknown};
        const name = typeof d.displayName === 'string' ? d.displayName.trim() : '';
        const email = typeof d.email === 'string' ? d.email.trim() : '';
        const label =
          [name || null, email || null].filter(Boolean).join(' · ') ||
          (uid.length <= 8 ? uid : `${uid.slice(0, 6)}...`);
        return [uid, label] as const;
      }),
    );
    return Object.fromEntries(pairs);
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
    const meeting: Meeting = {
      id: ref.id,
      ownerId: uid,
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

    const batch = writeBatch(db());
    batch.set(ref, meeting);
    batch.set(
      userDocRef(uid),
      {stats: {meetingsCreated: increment(1)}},
      {merge: true},
    );
    await batch.commit();
    return meeting;
  },

  async update(uid: string, id: string, draft: MeetingDraft): Promise<void> {
    const {startsAt, endsAt} = buildTimestamps(draft.dateISO, draft.startTime, draft.endTime);

    const ref = doc(meetingsCol(uid), id);
    const batch = writeBatch(db());
    batch.update(ref, {
      title: draft.title.trim(),
      description: draft.description?.trim() || null,
      dateISO: draft.dateISO,
      startTime: draft.startTime,
      endTime: draft.endTime,
      startsAt,
      endsAt,
      updatedAt: Date.now(),
    });
    batch.set(
      userDocRef(uid),
      {stats: {meetingsEdited: increment(1)}},
      {merge: true},
    );
    await batch.commit();
  },

  async remove(uid: string, id: string): Promise<void> {
    const ref = doc(meetingsCol(uid), id);
    const batch = writeBatch(db());
    batch.delete(ref);
    batch.set(
      userDocRef(uid),
      {stats: {meetingsDeleted: increment(1)}},
      {merge: true},
    );
    await batch.commit();
  },
};
