import type {MeetingDraft} from '@app-types/meeting';

export const buildMeetingDraft = (overrides: Partial<MeetingDraft> = {}): MeetingDraft => ({
  title: 'Workshop',
  description: null,
  dateISO: '2026-05-24',
  startTime: '14:00',
  endTime: '15:00',
  ...overrides,
});
