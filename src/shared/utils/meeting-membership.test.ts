import {buildMeeting} from '@testing/factories/meeting.factory';
import {meetingInvolvesUid} from './meeting-membership';

describe('meetingInvolvesUid', () => {
  it('matches organizer', () => {
    const m = buildMeeting({ownerId: 'alice', participantIds: []});
    expect(meetingInvolvesUid(m, 'alice')).toBe(true);
  });

  it('matches persisted invitees only', () => {
    const m = buildMeeting({ownerId: 'alice', participantIds: ['bob']});
    expect(meetingInvolvesUid(m, 'bob')).toBe(true);
    expect(meetingInvolvesUid(m, 'carol')).toBe(false);
  });

  it('handles missing viewer uid', () => {
    const m = buildMeeting({});
    expect(meetingInvolvesUid(m, undefined)).toBe(false);
    expect(meetingInvolvesUid(m, null)).toBe(false);
  });
});
