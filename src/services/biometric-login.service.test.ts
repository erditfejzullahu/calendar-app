import {Alert, Platform} from 'react-native';
import {
  ACCESS_CONTROL,
  BIOMETRY_TYPE,
  canImplyAuthentication,
  getGenericPassword,
  getSupportedBiometryType,
  hasGenericPassword,
  isPasscodeAuthAvailable,
  resetGenericPassword,
  setGenericPassword,
} from 'react-native-keychain';
import {
  biometricQuickLoginShortLabel,
  canOfferBiometricQuickLogin,
  clearBiometricStoredCredentials,
  hasBiometricStoredCredentials,
  loadCredentialsViaBiometrics,
  promptEnableBiometricsIfNeeded,
  saveCredentialsForBiometricUnlock,
} from './biometric-login.service';

jest.mock('react-native-keychain', () => ({
  ACCESS_CONTROL: {BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE: 'ac-bio-or-pass'},
  ACCESSIBLE: {WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'when-unlocked-device'},
  AUTHENTICATION_TYPE: {DEVICE_PASSCODE_OR_BIOMETRICS: 'dev-bio'},
  BIOMETRY_TYPE: {
    FACE_ID: 'face_id',
    FACE: 'face',
    TOUCH_ID: 'touch_id',
    FINGERPRINT: 'fingerprint',
    IRIS: 'iris',
  },
  canImplyAuthentication: jest.fn(),
  getSupportedBiometryType: jest.fn(),
  hasGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
  setGenericPassword: jest.fn(),
  isPasscodeAuthAvailable: jest.fn(),
}));

jest.mock('react-native', () => ({
  Alert: {alert: jest.fn()},
  Platform: {OS: 'ios'},
}));

describe('biometric-login.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as {OS: string}).OS = 'ios';
  });

  describe('canOfferBiometricQuickLogin', () => {
    it('uses canImplyAuthentication on iOS', async () => {
      jest.mocked(canImplyAuthentication).mockResolvedValue(true);
      await expect(canOfferBiometricQuickLogin()).resolves.toBe(true);
      expect(jest.mocked(canImplyAuthentication)).toHaveBeenCalled();
      expect(jest.mocked(getSupportedBiometryType)).not.toHaveBeenCalled();
    });

    it('falls back to biometry or passcode gate on Android', async () => {
      (Platform as {OS: string}).OS = 'android';
      jest.mocked(getSupportedBiometryType).mockResolvedValue(BIOMETRY_TYPE.FINGERPRINT);
      jest.mocked(isPasscodeAuthAvailable).mockResolvedValue(false);
      await expect(canOfferBiometricQuickLogin()).resolves.toBe(true);
    });

    it('returns false when the OS check throws', async () => {
      jest.mocked(canImplyAuthentication).mockRejectedValue(new Error('kc'));
      await expect(canOfferBiometricQuickLogin()).resolves.toBe(false);
    });
  });

  describe('hasBiometricStoredCredentials', () => {
    it('returns keychain truthiness', async () => {
      jest.mocked(hasGenericPassword).mockResolvedValue(true);
      await expect(hasBiometricStoredCredentials()).resolves.toBe(true);
    });

    it('returns false on failure', async () => {
      jest.mocked(hasGenericPassword).mockRejectedValue(new Error('nope'));
      await expect(hasBiometricStoredCredentials()).resolves.toBe(false);
    });
  });

  describe('biometricQuickLoginShortLabel', () => {
    it.each([
      [BIOMETRY_TYPE.FACE_ID, 'Face ID'],
      [BIOMETRY_TYPE.TOUCH_ID, 'Fingerprint'],
      [BIOMETRY_TYPE.IRIS, 'Iris unlock'],
      [null, 'Device lock'],
    ] as const)('maps %s → %s', async (biometry, label) => {
      jest.mocked(getSupportedBiometryType).mockResolvedValue(biometry);
      await expect(biometricQuickLoginShortLabel()).resolves.toBe(label);
    });
  });

  describe('saveCredentialsForBiometricUnlock', () => {
    it('passes trimmed email and returns true when keychain accepts', async () => {
      jest.mocked(setGenericPassword).mockResolvedValue(true as never);
      await expect(saveCredentialsForBiometricUnlock('  a@b.com  ', 'secret')).resolves.toBe(true);
      expect(jest.mocked(setGenericPassword)).toHaveBeenCalledWith(
        'a@b.com',
        'secret',
        expect.objectContaining({
          accessControl: ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
          authenticationPrompt: expect.objectContaining({
            title: 'Protect this account',
            cancel: 'Cancel',
          }),
        }),
      );
    });

    it('returns false when setGenericPassword rejects', async () => {
      jest.mocked(setGenericPassword).mockRejectedValue(new Error('denied'));
      await expect(saveCredentialsForBiometricUnlock('a@b.com', 'x')).resolves.toBe(false);
    });
  });

  describe('clearBiometricStoredCredentials', () => {
    it('swallows reset errors', async () => {
      jest.mocked(resetGenericPassword).mockRejectedValue(new Error('gone'));
      await expect(clearBiometricStoredCredentials()).resolves.toBeUndefined();
    });
  });

  describe('loadCredentialsViaBiometrics', () => {
    it('returns mapped username/password when credential is valid', async () => {
      jest.mocked(getGenericPassword).mockResolvedValue({username: 'u', password: 'p'} as never);
      await expect(loadCredentialsViaBiometrics()).resolves.toEqual({
        username: 'u',
        password: 'p',
      });
    });

    it('returns null when password missing', async () => {
      jest.mocked(getGenericPassword).mockResolvedValue({username: 'u', password: ''} as never);
      await expect(loadCredentialsViaBiometrics()).resolves.toBeNull();
    });

    it('returns null when getGenericPassword returns false', async () => {
      jest.mocked(getGenericPassword).mockResolvedValue(false as unknown as never);
      await expect(loadCredentialsViaBiometrics()).resolves.toBeNull();
    });
  });

  describe('promptEnableBiometricsIfNeeded', () => {
    it('shows an alert and persists when user taps Enable', async () => {
      jest.mocked(canImplyAuthentication).mockResolvedValue(true);
      jest.mocked(hasGenericPassword).mockResolvedValue(false);
      jest.mocked(getSupportedBiometryType).mockResolvedValue(BIOMETRY_TYPE.FACE_ID);
      jest.mocked(setGenericPassword).mockResolvedValue(true as never);

      await promptEnableBiometricsIfNeeded('mail@test.com', 'pw');

      expect(Alert.alert).toHaveBeenCalled();
      const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
      const enable = buttons.find((b: {text: string}) => b.text === 'Enable');
      await enable.onPress();
      expect(jest.mocked(setGenericPassword)).toHaveBeenCalled();
    });

    it('no-ops when biometrics cannot be offered', async () => {
      jest.mocked(canImplyAuthentication).mockResolvedValue(false);
      await promptEnableBiometricsIfNeeded('a@b.com', 'x');
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('no-ops when credentials already saved', async () => {
      jest.mocked(canImplyAuthentication).mockResolvedValue(true);
      jest.mocked(hasGenericPassword).mockResolvedValue(true);
      await promptEnableBiometricsIfNeeded('a@b.com', 'x');
      expect(Alert.alert).not.toHaveBeenCalled();
    });
  });
});
