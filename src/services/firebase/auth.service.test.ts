import * as FirebaseAuthModule from '@react-native-firebase/auth';
import {clearBiometricStoredCredentials} from '../biometric-login.service';
import {authService} from './auth.service';

jest.mock('../biometric-login.service', () => ({
  clearBiometricStoredCredentials: jest.fn(async () => undefined),
}));

type AuthListener = FirebaseAuthModule.FirebaseAuthTypes.AuthListenerCallback;

const {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  reload,
  reauthenticateWithCredential,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
  verifyBeforeUpdateEmail,
  EmailAuthProvider,
} = FirebaseAuthModule;

describe('authService', () => {
  let authHandle: {currentUser: FirebaseAuthModule.FirebaseAuthTypes.User | null};

  beforeEach(() => {
    jest.clearAllMocks();
    authHandle = {currentUser: null};
    jest.spyOn(FirebaseAuthModule, 'getAuth').mockReturnValue(authHandle as ReturnType<typeof FirebaseAuthModule.getAuth>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('maps Firebase user via current()', () => {
    authHandle.currentUser = {
      uid: 'u1',
      email: 'x@example.com',
      displayName: 'Ada',
    } as FirebaseAuthModule.FirebaseAuthTypes.User;
    expect(authService.current()).toEqual({
      uid: 'u1',
      email: 'x@example.com',
      displayName: 'Ada',
    });
  });

  it('signIn trims email and returns mapped user', async () => {
    jest.mocked(signInWithEmailAndPassword).mockResolvedValue({
      user: {uid: 'a', email: 'e@test.com', displayName: 'N'},
    } as never);
    const user = await authService.signIn('  e@test.com  ', 'pw');
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(authHandle, 'e@test.com', 'pw');
    expect(user.uid).toBe('a');
  });

  it('signIn throws when user mapping is unexpectedly empty', async () => {
    jest.mocked(signInWithEmailAndPassword).mockResolvedValue({user: null} as never);
    await expect(authService.signIn('a@b.com', 'pw')).rejects.toThrow('Authentication failed');
  });

  it('signUp skips profile updates for blank display names and emails the fresh account', async () => {
    const created = {uid: 'new', email: 'n@example.com', displayName: null as string | null};
    jest.mocked(createUserWithEmailAndPassword).mockResolvedValue({user: created} as never);
    authHandle.currentUser = created as FirebaseAuthModule.FirebaseAuthTypes.User;

    const user = await authService.signUp('n@example.com ', 'pw', '   ');
    expect(updateProfile).not.toHaveBeenCalled();
    expect(sendEmailVerification).toHaveBeenCalled();
    expect(user.uid).toBe('new');
  });

  it('signUp trims display names and persists them via Firebase profile APIs', async () => {
    const created = {uid: 'u2', email: 'n2@example.com', displayName: null as string | null};
    jest.mocked(createUserWithEmailAndPassword).mockResolvedValue({user: created} as never);
    authHandle.currentUser = created as FirebaseAuthModule.FirebaseAuthTypes.User;
    jest.mocked(updateProfile).mockImplementation(async (u, p) => {
      Object.assign(u as object, p);
    });

    const user = await authService.signUp('n2@example.com', 'pw', '  Lois  ');
    expect(updateProfile).toHaveBeenCalledWith(created, {displayName: 'Lois'});
    expect(reload).toHaveBeenCalledWith(created);
    expect(user.displayName).toBe('Lois');
  });

  it('signOut delegates to firebase', async () => {
    jest.mocked(signOut).mockResolvedValue(undefined);
    await authService.signOut();
    expect(signOut).toHaveBeenCalledWith(authHandle);
  });

  it('subscribe forwards mapped users', () => {
    const cb = jest.fn();
    jest.mocked(FirebaseAuthModule.onAuthStateChanged).mockImplementation((_a, listener) => {
      (listener as AuthListener)({
        uid: 's',
        email: null,
        displayName: null,
      } as FirebaseAuthModule.FirebaseAuthTypes.User);
      return jest.fn();
    });
    authService.subscribe(cb);
    expect(cb).toHaveBeenCalledWith({uid: 's', email: null, displayName: null});
  });

  describe('applyProfileUpdates', () => {
    const baseUser = {
      uid: 'u',
      email: 'old@example.com',
      displayName: 'Old',
    } as FirebaseAuthModule.FirebaseAuthTypes.User;

    beforeEach(() => {
      authHandle.currentUser = baseUser;
    });

    it('throws when nobody is signed in', async () => {
      authHandle.currentUser = null;
      await expect(
        authService.applyProfileUpdates({
          initialEmailLower: '',
          displayName: 'X',
          email: 'x@y.com',
        }),
      ).rejects.toThrow('No signed-in user.');
    });

    it('no-ops when nothing changed', async () => {
      const res = await authService.applyProfileUpdates({
        initialEmailLower: 'old@example.com',
        displayName: 'Old',
        email: 'old@example.com',
      });
      expect(res).toEqual({emailVerificationSent: false});
      expect(updateProfile).not.toHaveBeenCalled();
    });

    it('updates display name only without reauthentication', async () => {
      const res = await authService.applyProfileUpdates({
        initialEmailLower: 'old@example.com',
        displayName: 'Fresh',
        email: 'old@example.com',
      });
      expect(res).toEqual({emailVerificationSent: false});
      expect(updateProfile).toHaveBeenCalledWith(baseUser, {displayName: 'Fresh'});
      expect(reload).toHaveBeenCalledWith(baseUser);
      expect(reauthenticateWithCredential).not.toHaveBeenCalled();
    });

    it('requires current password before sensitive edits', async () => {
      await expect(
        authService.applyProfileUpdates({
          initialEmailLower: 'old@example.com',
          displayName: 'Old',
          email: 'new@example.com',
        }),
      ).rejects.toThrow('Enter your current password');
    });

    it('updates password then clears biometric quick-login blob', async () => {
      jest.mocked(EmailAuthProvider.credential).mockReturnValue({type: 'password'} as never);
      await authService.applyProfileUpdates({
        initialEmailLower: 'old@example.com',
        displayName: 'Old',
        email: 'old@example.com',
        currentPassword: 'secret',
        newPassword: 'N3w_Str0ng!',
      });
      expect(reauthenticateWithCredential).toHaveBeenCalled();
      expect(updatePassword).toHaveBeenCalledWith(baseUser, 'N3w_Str0ng!');
      expect(jest.mocked(clearBiometricStoredCredentials)).toHaveBeenCalled();
    });

    it('rejects conflicting email registrations before verify-before-update flow', async () => {
      jest.mocked(fetchSignInMethodsForEmail).mockResolvedValue([
        FirebaseAuthModule.EmailAuthProvider.EMAIL_PASSWORD_SIGN_IN_METHOD,
      ]);

      await expect(
        authService.applyProfileUpdates({
          initialEmailLower: 'old@example.com',
          displayName: 'Old',
          email: 'taken@example.com',
          currentPassword: 'cur',
        }),
      ).rejects.toThrow('That email is already registered.');
      expect(verifyBeforeUpdateEmail).not.toHaveBeenCalled();
    });

    it('sends verification mail when switching to a virgin email alias', async () => {
      jest.mocked(fetchSignInMethodsForEmail).mockResolvedValue([]);
      jest.mocked(verifyBeforeUpdateEmail).mockResolvedValue(undefined);

      const res = await authService.applyProfileUpdates({
        initialEmailLower: 'old@example.com',
        displayName: 'Old',
        email: 'next@example.com',
        currentPassword: 'secret',
      });
      expect(res).toEqual({emailVerificationSent: true});
      expect(verifyBeforeUpdateEmail).toHaveBeenCalledWith(baseUser, 'next@example.com');
    });
  });
});
