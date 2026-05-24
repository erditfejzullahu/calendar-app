import type {Meeting} from '@app-types/meeting';

/**
 * Canonical factory defaults — override fields per scenario to keep assertions readable.
 */
export const buildMeeting = (overrides: Partial<Meeting> = {}): Meeting => {
  const base: Meeting = {
    id: 'meeting-1',
    ownerId: 'user-1',
    participantIds: [],
    title: 'Team sync',
    description: null,
    dateISO: '2026-05-24',
    startTime: '10:00',
    endTime: '11:00',
    startsAt: Date.parse('2026-05-24T10:00:00'),
    endsAt: Date.parse('2026-05-24T11:00:00'),
    createdAt: 1,
    updatedAt: 1,
  };
  return {...base, ...overrides};
};
