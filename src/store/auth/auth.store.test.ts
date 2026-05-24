import {buildAuthUser} from '@testing/factories/user.factory';
import {authService} from '@services/firebase/auth.service';
import {clearBiometricStoredCredentials} from '@services/biometric-login.service';
import {meetingsService} from '@services/firebase/meetings.service';
import {useAuthStore} from './auth.store';

jest.mock('@services/firebase/auth.service', () => ({
  authService: {
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    subscribe: jest.fn(() => jest.fn()),
    current: jest.fn(),
  },
}));

jest.mock('@services/firebase/meetings.service', () => ({
  meetingsService: {
    ensureUserDoc: jest.fn(async () => undefined),
  },
}));

jest.mock('@services/biometric-login.service', () => ({
  clearBiometricStoredCredentials: jest.fn(async () => undefined),
}));

const mockedAuthService = jest.mocked(authService);
const mockedEnsureUserDoc = jest.mocked(meetingsService.ensureUserDoc);

describe('auth.store actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({status: 'unauthenticated', user: null, error: null, busy: false});
  });

  it('routes Firebase auth/email failure copy into UX error state', async () => {
    mockedAuthService.signIn.mockRejectedValue({code: 'auth/user-not-found'});

    await expect(useAuthStore.getState().actions.signIn('a@example.com', 'pw')).rejects.toBeTruthy();
    expect(useAuthStore.getState().error).toBe('Invalid email or password.');
    expect(useAuthStore.getState().busy).toBe(false);
  });

  it('merges Firebase users into docs after signup', async () => {
    const user = buildAuthUser();
    mockedAuthService.signUp.mockResolvedValue(user);

    await expect(useAuthStore.getState().actions.signUp('a@example.com', 'Str0ng!1', 'Ada')).resolves.toBeUndefined();
    expect(mockedEnsureUserDoc).toHaveBeenCalledWith(user.uid, user.email, user.displayName);
  });

  it('signs out and clears session without removing device biometric quick-login', async () => {
    mockedAuthService.signOut.mockResolvedValue(undefined);

    await useAuthStore.getState().actions.signOut();

    expect(clearBiometricStoredCredentials).not.toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().error).toBeNull();
  });

  it('allows consumers to discard stale auth errors explicitly', () => {
    useAuthStore.setState({error: 'stale'});
    useAuthStore.getState().actions.clearError();
    expect(useAuthStore.getState().error).toBeNull();
  });
});
