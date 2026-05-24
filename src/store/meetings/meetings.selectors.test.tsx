import {buildMeeting} from '@testing/factories/meeting.factory';
import {buildAuthUser} from '@testing/factories/user.factory';
import {renderHook} from '@testing-library/react-native';
import {useAuthStore} from '@store/auth/auth.store';
import {useAllUpcomingMeetings, useMeetingCountsByDate, useUpcomingMeetings} from './meetings.selectors';
import {bindMeetingsToUser, useMeetingsStore} from './meetings.store';

jest.mock('@services/firebase/meetings.service', () => ({
  meetingsService: {
    subscribeAll: jest.fn(() => jest.fn()),
    subscribeMeetingsAcrossAllUsers: jest.fn(() => jest.fn()),
    subscribeMeetingsWhereUserIsParticipant: jest.fn(() => jest.fn()),
    subscribeOwnMeetingsMergedWithParticipantInvites: jest.fn(() => jest.fn()),
    subscribeUsersDirectory: jest.fn(() => jest.fn()),
    subscribeUserDocument: jest.fn(() => jest.fn()),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    fetchMeetingFromServer: jest.fn(),
    fetchMeetingUserDisplayBundle: jest.fn(async () => ({ownerHints: {}, userPeekByUid: {}})),
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

  it('shows bookings you organize for upcoming previews (not strangers’ calendars)', () => {
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

  it('shows meetings you were explicitly invited to in upcoming previews', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_720_000_000_000);
    useMeetingsStore.getState().internal._hydrateMeetings([
      buildMeeting({
        ownerId: 'host',
        id: 'invite',
        participantIds: ['self'],
        startsAt: 1_720_000_000_050,
      }),
      buildMeeting({
        ownerId: 'host',
        id: 'skipped',
        participantIds: [],
        startsAt: 1_720_000_000_060,
      }),
    ]);
    useAuthStore.setState({
      status: 'authenticated',
      user: buildAuthUser({uid: 'self'}),
    });

    const {result} = renderHook(() => useUpcomingMeetings(5));

    expect(result.current.map(meeting => meeting.id)).toEqual(['invite']);
  });

  it('returns every upcoming meeting when unlimited hook is used', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_720_000_000_000);
    const ts = (i: number) => 1_720_000_000_000 + i * 60_000;
    useMeetingsStore.getState().internal._hydrateMeetings(
      Array.from({length: 7}, (_, i) =>
        buildMeeting({
          ownerId: 'self',
          id: `m${i}`,
          startsAt: ts(i + 1),
        }),
      ),
    );
    useAuthStore.setState({
      status: 'authenticated',
      user: buildAuthUser({uid: 'self'}),
    });

    const {result} = renderHook(() => useAllUpcomingMeetings());

    expect(result.current.map(m => m.id)).toEqual(['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6']);
  });

  it('still caps useUpcomingMeetings when a limit is passed', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_720_000_000_000);
    const ts = (i: number) => 1_720_000_000_000 + i * 60_000;
    useMeetingsStore.getState().internal._hydrateMeetings(
      Array.from({length: 7}, (_, i) =>
        buildMeeting({
          ownerId: 'self',
          id: `m${i}`,
          startsAt: ts(i + 1),
        }),
      ),
    );
    useAuthStore.setState({
      status: 'authenticated',
      user: buildAuthUser({uid: 'self'}),
    });

    const {result} = renderHook(() => useUpcomingMeetings(5));

    expect(result.current.map(m => m.id)).toEqual(['m0', 'm1', 'm2', 'm3', 'm4']);
  });
});
