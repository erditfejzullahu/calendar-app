import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reload,
  sendEmailVerification as fbSendEmailVerification,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updatePassword as fbUpdatePassword,
  verifyBeforeUpdateEmail,
  updateProfile as fbUpdateProfile,
} from '@react-native-firebase/auth';
import {clearBiometricStoredCredentials} from '../biometric-login.service';
import {getAuth, type FirebaseAuthTypes} from './config';
import type {AuthUser} from '@app-types/user';

const auth = () => getAuth();

const mapUser = (u: FirebaseAuthTypes.User | null): AuthUser | null =>
  u
    ? {
        uid: u.uid,
        email: u.email,
        displayName: u.displayName,
      }
    : null;

/** Human-readable Firebase / validation errors when editing profile. */
export const mapProfileUpdateError = (e: unknown): string => {
  const code =
    typeof e === 'object' && e && 'code' in e ? String((e as {code: string}).code) : '';
  const msg = e instanceof Error ? e.message : '';
  const blob = `${code} ${msg}`.toLowerCase();
  if (blob.includes('email-already-in-use') || blob.includes('credential-already-in-use')) {
    return 'That email is already linked to another account.';
  }
  if (blob.includes('invalid-email')) return 'That email address looks invalid.';
  if (blob.includes('weak-password')) return 'Password is too weak.';
  if (blob.includes('wrong-password') || blob.includes('invalid-credential'))
    return 'Current password is incorrect.';
  if (blob.includes('requires-recent-login')) return 'Please sign out and sign in again, then retry.';
  if (blob.includes('operation-not-allowed') && blob.includes('verify'))
    return 'Firebase only allows switching email after verifying the new address. Use “verify before update”; do not rely on updating email immediately.';
  if (blob.includes('network')) return 'Network error. Check your connection and try again.';
  if (blob.includes('enter your current')) return msg || 'Something went wrong. Please try again.';
  return 'Something went wrong. Please try again.';
};

export type ApplyProfileUpdatesInput = {
  initialEmailLower: string;
  displayName: string;
  email: string;
  currentPassword?: string;
  newPassword?: string;
};

export type ApplyProfileUpdatesResult = {
  /** True when Firebase sent a verification link to the new address. */
  emailVerificationSent: boolean;
};

export const authService = {
  current(): AuthUser | null {
    return mapUser(auth().currentUser);
  },

  subscribe(onChange: (user: AuthUser | null) => void): () => void {
    return onAuthStateChanged(auth(), u => onChange(mapUser(u)));
  },

  async signIn(email: string, password: string): Promise<AuthUser> {
    const result = await signInWithEmailAndPassword(auth(), email.trim(), password);
    const user = mapUser(result.user);
    if (!user) throw new Error('Authentication failed');
    return user;
  },

  async signUp(email: string, password: string, displayName: string): Promise<AuthUser> {
    const result = await createUserWithEmailAndPassword(auth(), email.trim(), password);
    const displayTrim = displayName.trim();
    if (displayTrim.length > 0) {
      await fbUpdateProfile(result.user, {displayName: displayTrim});
      await reload(result.user);
    }
    const userForVerification = auth().currentUser ?? result.user;
    await fbSendEmailVerification(userForVerification);
    const user = mapUser(auth().currentUser);
    if (!user) throw new Error('Sign up failed');
    return user;
  },

  async signOut(): Promise<void> {
    await fbSignOut(auth());
  },

  /**
   * Applies display name, optional password change, optional email change.
   * Email changes use Firebase `verifyBeforeUpdateEmail` (required when Console enforces verification before updating).
   * Reauthenticates once when sensitive fields change. Clears biometric quick-login after password change.
   */
  async applyProfileUpdates(payload: ApplyProfileUpdatesInput): Promise<ApplyProfileUpdatesResult> {
    const inst = auth();
    const user = inst.currentUser;
    if (!user?.email) {
      throw new Error('No signed-in user.');
    }

    const displayTrim = payload.displayName.trim();
    const emailNext = payload.email.trim();
    const emailNextLc = emailNext.toLowerCase();
    const pwdNext = payload.newPassword?.trim() ?? '';
    const pwdDirty = pwdNext.length > 0;
    const emailDirty = emailNextLc !== payload.initialEmailLower;
    const displayDirty = displayTrim !== (user.displayName?.trim() ?? '');
    const needsSensitive = emailDirty || pwdDirty;

    if (!(displayDirty || needsSensitive)) {
      return {emailVerificationSent: false};
    }

    if (displayDirty && !needsSensitive) {
      await fbUpdateProfile(user, {displayName: displayTrim});
      await reload(user);
      return {emailVerificationSent: false};
    }

    const curPass = payload.currentPassword?.trim() ?? '';
    if (needsSensitive && !curPass) {
      throw new Error('Enter your current password to change email or password.');
    }

    if (needsSensitive) {
      const credential = EmailAuthProvider.credential(user.email, curPass);
      await reauthenticateWithCredential(user, credential);
    }

    let emailVerificationSent = false;

    if (displayDirty) {
      await fbUpdateProfile(user, {displayName: displayTrim});
    }

    if (pwdDirty) {
      await fbUpdatePassword(user, pwdNext);
      await clearBiometricStoredCredentials();
    }

    if (emailDirty) {
      const methods = await fetchSignInMethodsForEmail(inst, emailNext);
      if (methods.includes(EmailAuthProvider.EMAIL_PASSWORD_SIGN_IN_METHOD)) {
        throw new Error('That email is already registered.');
      }
      await verifyBeforeUpdateEmail(user, emailNext);
      emailVerificationSent = true;
    }

    await reload(user);
    return {emailVerificationSent};
  },
};
