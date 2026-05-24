import {renderHook, act} from '@testing-library/react-native';
import {buildAuthUser} from '@testing/factories/user.factory';
import {authService} from '@services/firebase/auth.service';
import {meetingsService} from '@services/firebase/meetings.service';
import {useAuthStore} from '@store/auth/auth.store';
import {useSignUpForm} from './useSignUpForm';

jest.mock('@services/firebase/auth.service', () => ({
  authService: {
    signUp: jest.fn(),
    subscribe: jest.fn(() => jest.fn()),
    current: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  },
}));

jest.mock('@services/firebase/meetings.service', () => ({
  meetingsService: {
    ensureUserDoc: jest.fn(async () => undefined),
  },
}));

const mockedAuth = jest.mocked(authService);

describe('useSignUpForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({status: 'unauthenticated', user: null, busy: false, error: null});
    mockedAuth.signUp.mockResolvedValue(buildAuthUser({email: 'new@example.com'}));
    jest.mocked(meetingsService.ensureUserDoc).mockResolvedValue(undefined);
  });

  it('pipes validated payloads into signup + profile bootstrap', async () => {
    const {result} = renderHook(() => useSignUpForm());

    await act(async () => {
      result.current.form.reset({
        displayName: 'Grace Hopper',
        email: 'grace@example.com',
        password: 'Str0ng!pass',
        confirm: 'Str0ng!pass',
      });
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(mockedAuth.signUp).toHaveBeenCalledWith('grace@example.com', 'Str0ng!pass', 'Grace Hopper');
  });
});
