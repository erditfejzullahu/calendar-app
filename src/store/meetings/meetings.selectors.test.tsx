import {buildMeeting} from '@testing/factories/meeting.factory';
import {buildAuthUser} from '@testing/factories/user.factory';
import {renderHook} from '@testing-library/react-native';
import {useAuthStore} from '@store/auth/auth.store';
import {useMeetingCountsByDate, useUpcomingMeetings} from './meetings.selectors';
import {bindMeetingsToUser, useMeetingsStore} from './meetings.store';

jest.mock('@services/firebase/meetings.service', () => ({
  meetingsService: {
    subscribeAll: jest.fn(() => jest.fn()),
    subscribeMeetingsAcrossAllUsers: jest.fn(() => jest.fn()),
    subscribeUserDocument: jest.fn(() => jest.fn()),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    fetchMeetingFromServer: jest.fn(),
    fetchOwnerDisplayHints: jest.fn(),
    ensureUserDoc: jest.fn(async () => undefined),
  },
}));

describe('meetings selectors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bindMeetingsToUser(null);
    useAuthStore.setState({status: 'unauthenticated', user: null, busy: false, error: null});
    useMeetingsStore.getState().internal._hydrateMeetings([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('indexes per-day totals for badges', () => {
    useMeetingsStore.getState().internal._hydrateMeetings([
      buildMeeting({ownerId: 'self', dateISO: '2026-05-24', startsAt: 10, endsAt: 11, id: 'a'}),
      buildMeeting({
        ownerId: 'self',
        dateISO: '2026-05-24',
        startsAt: 12,
        endsAt: 13,
        id: 'b',
      }),
      buildMeeting({
        ownerId: 'self',
        dateISO: '2026-05-26',
        startsAt: 20,
        endsAt: 21,
        id: 'c',
      }),
    ]);

    const {result} = renderHook(() => useMeetingCountsByDate());
    expect(result.current['2026-05-24']).toBe(2);
    expect(result.current['2026-05-26']).toBe(1);
  });

  it('shows only organizer-owned bookings for upcoming previews when uid is scoped', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_720_000_000_000);
    useMeetingsStore.getState().internal._hydrateMeetings([
      buildMeeting({
        ownerId: 'self',
        id: 'mine',
        startsAt: 1_720_000_000_050,
      }),
      buildMeeting({
        ownerId: 'peer',
        id: 'foreign',
        startsAt: 1_720_000_000_100,
      }),
    ]);
    useAuthStore.setState({
      status: 'authenticated',
      user: buildAuthUser({uid: 'self'}),
    });

    const {result} = renderHook(() => useUpcomingMeetings(5));

    expect(result.current.map(meeting => meeting.id)).toEqual(['mine']);
  });
});
