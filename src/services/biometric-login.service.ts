/**
 * Stores Firebase email/password in the OS keystore guarded by biometric + device-passcode fallback.
 * No third-party backends — aligns with Apple's Keychain Access / Android StrongBox patterns.
 */

import {
  ACCESS_CONTROL,
  ACCESSIBLE,
  AUTHENTICATION_TYPE,
  BIOMETRY_TYPE,
  canImplyAuthentication,
  getSupportedBiometryType,
  hasGenericPassword,
  getGenericPassword,
  resetGenericPassword,
  setGenericPassword,
  isPasscodeAuthAvailable,
} from 'react-native-keychain';
import {Alert, Platform} from 'react-native';

const KEYCHAIN_SERVICE = 'CalendarApp.quickLogin.credentials';

async function biometricKindLabel(): Promise<string> {
  const t = await getSupportedBiometryType();
  switch (t) {
    case BIOMETRY_TYPE.FACE_ID:
    case BIOMETRY_TYPE.FACE:
      return 'Face ID';
    case BIOMETRY_TYPE.TOUCH_ID:
    case BIOMETRY_TYPE.FINGERPRINT:
      return 'Fingerprint';
    case BIOMETRY_TYPE.IRIS:
      return 'Iris unlock';
    default:
      return 'Device lock';
  }
}

/** True when the OS can shield keychain reads with biometric / PIN (save & quick sign-in feasible). */
export async function canOfferBiometricQuickLogin(): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      return await canImplyAuthentication({
        authenticationType: AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS,
      });
    }
    return (await getSupportedBiometryType()) !== null || (await isPasscodeAuthAvailable());
  } catch {
    return false;
  }
}

export async function hasBiometricStoredCredentials(): Promise<boolean> {
  try {
    return await hasGenericPassword({service: KEYCHAIN_SERVICE});
  } catch {
    return false;
  }
}

export async function biometricQuickLoginShortLabel(): Promise<string> {
  return biometricKindLabel();
}

export async function saveCredentialsForBiometricUnlock(email: string, password: string): Promise<boolean> {
  try {
    const res = await setGenericPassword(email.trim(), password, {
      service: KEYCHAIN_SERVICE,
      accessControl: ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
      accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      authenticationPrompt: {
        title: 'Protect this account',
        subtitle:
          Platform.OS === 'ios'
            ? 'Use Face ID, Touch ID, or your device passcode.'
            : 'Use biometrics or your screen lock.',
        cancel: 'Cancel',
      },
    });
    return res !== false;
  } catch {
    return false;
  }
}

/** Remove quick-login credential (call on sign-out so the device no longer trusts this session). */
export async function clearBiometricStoredCredentials(): Promise<void> {
  try {
    await resetGenericPassword({service: KEYCHAIN_SERVICE});
  } catch {
    /* noop */
  }
}

export async function loadCredentialsViaBiometrics(): Promise<{
  username: string;
  password: string;
} | null> {
  try {
    const cred = await getGenericPassword({
      service: KEYCHAIN_SERVICE,
      authenticationPrompt: {
        title: 'Sign in to CalendarApp',
        subtitle: 'Authenticate to continue',
        cancel: 'Cancel',
      },
    });
    if (cred === false || !cred?.password?.length) return null;
    return {username: cred.username, password: cred.password};
  } catch {
    return null;
  }
}

/** One-shot UX after successful email/password sign-in. */
export async function promptEnableBiometricsIfNeeded(email: string, password: string): Promise<void> {
  try {
    if (!(await canOfferBiometricQuickLogin())) return;
    if (await hasBiometricStoredCredentials()) return;

    const kind = await getSupportedBiometryType();
    const unlockVerb =
      kind === BIOMETRY_TYPE.FACE_ID || kind === BIOMETRY_TYPE.FACE
        ? 'Face unlock'
        : kind === BIOMETRY_TYPE.TOUCH_ID || kind === BIOMETRY_TYPE.FINGERPRINT
          ? 'Your fingerprint'
          : Platform.OS === 'ios'
            ? 'Face ID, Touch ID, or your device passcode'
            : 'Fingerprint or screen lock';

    Alert.alert(
      'Faster next time?',
      `Save sign-in securely on this device. Next time use ${unlockVerb} instead of your password.`,
      [
        {text: 'Not now', style: 'cancel'},
        {
          text: 'Enable',
          onPress: async () => {
            const ok = await saveCredentialsForBiometricUnlock(email, password);
            if (!ok) {
              Alert.alert('Could not enable', 'Secure unlock is unavailable. You can enable it after the next manual sign-in.');
            }
          },
        },
      ],
    );
  } catch {
    /* non-blocking */
  }
}
