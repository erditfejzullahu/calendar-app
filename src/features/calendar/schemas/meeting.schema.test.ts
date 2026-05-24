import {buildMeeting} from '@testing/factories/meeting.factory';
import {buildMeetingSchema} from './meeting.schema';

describe('buildMeetingSchema', () => {
  const dateISO = '2026-05-24';

  it('accepts a valid non-overlapping window', () => {
    const schema = buildMeetingSchema([], undefined);
    const parsed = schema.safeParse({
      title: 'Focus block',
      description: '',
      dateISO,
      startTime: '09:00',
      endTime: '10:00',
      participantIds: [],
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects titles shorter than 2 chars', () => {
    const schema = buildMeetingSchema([], undefined);
    const parsed = schema.safeParse({
      title: 'x',
      description: '',
      dateISO,
      startTime: '09:00',
      endTime: '10:00',
      participantIds: [],
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects invalid HH:mm strings', () => {
    const schema = buildMeetingSchema([], undefined);
    const parsed = schema.safeParse({
      title: 'OK',
      description: '',
      dateISO,
      startTime: '9:00',
      endTime: '10:00',
      participantIds: [],
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects end time before or equal to start', () => {
    const schema = buildMeetingSchema([], undefined);
    const parsed = schema.safeParse({
      title: 'Bad window',
      description: '',
      dateISO,
      startTime: '11:00',
      endTime: '10:00',
      participantIds: [],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const endIssue = parsed.error.flatten().fieldErrors.endTime;
      expect(endIssue?.length).toBeGreaterThan(0);
    }
  });

  it('surfaces overlap errors on startTime with a helpful message', () => {
    const busy = buildMeeting({
      id: 'existing',
      title: 'Existing',
      dateISO,
      startTime: '10:00',
      endTime: '11:00',
    });
    const schema = buildMeetingSchema([busy], undefined);
    const parsed = schema.safeParse({
      title: 'Clash',
      description: '',
      dateISO,
      startTime: '10:30',
      endTime: '11:30',
      participantIds: [],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const startIssue = parsed.error.flatten().fieldErrors.startTime?.join(' ') ?? '';
      expect(startIssue).toContain('Existing');
    }
  });
});
