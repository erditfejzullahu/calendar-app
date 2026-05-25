import {buildAuthUser} from '@testing/factories/user.factory';
import {authService} from '@services/firebase/auth.service';
import {clearBiometricStoredCredentials} from '@services/biometric-login.service';
import {meetingsService} from '@services/firebase/meetings.service';
import {act} from '@testing-library/react-native';
import {initAuthListener, useAuthStore} from './auth.store';

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
  let errorLog: jest.SpyInstance<void, Parameters<typeof console.error>>;

  beforeEach(() => {
    jest.clearAllMocks();
    errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
    useAuthStore.setState({status: 'unauthenticated', user: null, error: null, busy: false});
  });

  afterEach(() => {
    errorLog.mockRestore();
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

  it('maps weak-password churn into friendly onboarding copy', async () => {
    mockedAuthService.signUp.mockRejectedValue({code: 'auth/weak-password'});

    await expect(useAuthStore.getState().actions.signUp('a@b.com', '123', 'X')).rejects.toBeTruthy();
    expect(useAuthStore.getState().error).toContain('Password is too weak');
  });

  it('surfaces sign-out failures instead of wiping the session blindly', async () => {
    mockedAuthService.signOut.mockRejectedValue(new Error('offline'));
    useAuthStore.setState({status: 'authenticated', user: buildAuthUser()});

    await expect(useAuthStore.getState().actions.signOut()).rejects.toThrow('offline');
    expect(useAuthStore.getState().status).toBe('authenticated');
  });

  it('reloads firebase profile into zustand and ensures user docs', async () => {
    const user = buildAuthUser({uid: 'sync'});
    mockedAuthService.current.mockReturnValue(user);

    await expect(useAuthStore.getState().actions.syncSessionFromFirebase()).resolves.toBeUndefined();

    expect(useAuthStore.getState().user?.uid).toBe('sync');
    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(mockedEnsureUserDoc).toHaveBeenCalledWith(user.uid, user.email, user.displayName);
  });

  it('marks users unauthenticated when firebase session vanishes mid refresh', async () => {
    mockedAuthService.current.mockReturnValue(null);

    await expect(useAuthStore.getState().actions.syncSessionFromFirebase()).resolves.toBeUndefined();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(mockedEnsureUserDoc).not.toHaveBeenCalled();
  });

  it('keeps signup responsive even if downstream user doc merges fail transiently', async () => {
    const user = buildAuthUser({uid: 'u'});
    mockedAuthService.signUp.mockResolvedValue(user);
    mockedEnsureUserDoc.mockRejectedValueOnce(new Error('firestore flake'));

    await expect(useAuthStore.getState().actions.signUp('a@b.com', 'Str0ng!1', 'Ada')).resolves.toBeUndefined();
    expect(useAuthStore.getState().busy).toBe(false);
  });
});

describe('initAuthListener', () => {
  let listenerErrorSpy: jest.SpyInstance<void, Parameters<typeof console.error>>;

  beforeEach(() => {
    jest.clearAllMocks();
    listenerErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    useAuthStore.setState({status: 'initializing', user: null, error: null, busy: false});
    mockedEnsureUserDoc.mockResolvedValue(undefined);
    mockedAuthService.subscribe.mockImplementation(() => jest.fn());
  });

  afterEach(() => {
    listenerErrorSpy.mockRestore();
  });

  it('mirrors streamed firebase users plus profile hydration', async () => {
    let onSession!: (user: ReturnType<typeof buildAuthUser> | null) => Promise<void>;
    mockedAuthService.subscribe.mockImplementation(cb => {
      onSession = cb as typeof onSession;
      return jest.fn();
    });

    const unsub = initAuthListener();

    await act(async () => {
      await onSession(buildAuthUser({uid: 'stream'}));
    });

    expect(unsub).toEqual(expect.any(Function));
    expect(useAuthStore.getState().user?.uid).toBe('stream');
    expect(mockedEnsureUserDoc).toHaveBeenCalled();

    unsub();
  });
});
