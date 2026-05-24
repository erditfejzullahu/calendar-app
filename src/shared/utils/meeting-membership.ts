import type {Meeting} from '@app-types/meeting';

/** True when the viewer is the organizer or listed in persisted `participantIds`. */
export const meetingInvolvesUid = (
  meeting: Meeting,
  uid: string | null | undefined,
): boolean =>
  Boolean(uid && (meeting.ownerId === uid || meeting.participantIds.includes(uid)));
