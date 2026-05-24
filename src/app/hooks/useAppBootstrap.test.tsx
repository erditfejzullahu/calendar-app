import {renderHook, act} from '@testing-library/react-native';
import {buildAuthUser} from '@testing/factories/user.factory';
import {useAuthStore, initAuthListener} from '@store/auth/auth.store';
import {bindMeetingsToUser} from '@store/meetings/meetings.store';
import {useAppBootstrap} from './useAppBootstrap';

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

jest.mock('@services/firebase/auth.service', () => ({
  authService: {
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    subscribe: jest.fn(() => jest.fn()),
    current: jest.fn(),
  },
}));

jest.mock('@services/biometric-login.service', () => ({
  clearBiometricStoredCredentials: jest.fn(async () => undefined),
}));

jest.mock('@store/auth/auth.store', () => {
  const actual = jest.requireActual('@store/auth/auth.store') as typeof import('@store/auth/auth.store');
  return {
    ...actual,
    initAuthListener: jest.fn(() => jest.fn()),
  };
});

jest.mock('@store/meetings/meetings.store', () => {
  const actual = jest.requireActual('@store/meetings/meetings.store') as typeof import('@store/meetings/meetings.store');
  return {
    ...actual,
    bindMeetingsToUser: jest.fn(),
  };
});

const mockedInitListener = jest.mocked(initAuthListener);
const mockedBindMeetings = jest.mocked(bindMeetingsToUser);

describe('useAppBootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({status: 'unauthenticated', user: null, busy: false, error: null});
  });

  it('binds lifecycle listeners and fans out uid changes to Firestore bridges', () => {
    const {unmount} = renderHook(() => useAppBootstrap());

    expect(mockedInitListener).toHaveBeenCalledTimes(1);
    expect(mockedBindMeetings).toHaveBeenCalledWith(null);

    act(() => {
      useAuthStore.setState({
        status: 'authenticated',
        user: buildAuthUser({uid: 'abc'}),
      });
    });

    expect(mockedBindMeetings).toHaveBeenLastCalledWith('abc');

    unmount();
    expect(mockedBindMeetings).toHaveBeenLastCalledWith(null);
  });
});
