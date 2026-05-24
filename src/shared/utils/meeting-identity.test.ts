import {meetingCompositeKey} from './meeting-identity';

describe('meetingCompositeKey', () => {
  it('joins organizer id + meeting id deterministically', () => {
    expect(meetingCompositeKey({ownerId: 'abc', id: 'm1'})).toBe('abc:m1');
  });
});
