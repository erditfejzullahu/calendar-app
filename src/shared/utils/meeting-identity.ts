import type {Meeting} from '@app-types/meeting';

/** Stable composite key combining organizer uid and meeting Firestore doc id. */
export const meetingCompositeKey = (m: Pick<Meeting, 'ownerId' | 'id'>): string =>
  `${m.ownerId}:${m.id}`;
