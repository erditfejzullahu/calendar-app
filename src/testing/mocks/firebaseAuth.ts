/**
 * Jest seam: RN Firebase pulls native binaries + transitive Firebase JS SDK ESM.
 * Anything under `services/firebase/*` should compile against the real typings, but tests
 * replace the runtime module via `jest.config.js` mapping.
 */

export const EmailAuthProvider = {
  credential: jest.fn(() => ({type: 'password'})),
  EMAIL_PASSWORD_SIGN_IN_METHOD: 'password',
};

export const createUserWithEmailAndPassword = jest.fn();
export const fetchSignInMethodsForEmail = jest.fn();
export const onAuthStateChanged = jest.fn(() => jest.fn());
export const reauthenticateWithCredential = jest.fn();
export const reload = jest.fn();
export const sendEmailVerification = jest.fn();
export const signInWithEmailAndPassword = jest.fn();
export const signOut = jest.fn();
export const updatePassword = jest.fn();
export const verifyBeforeUpdateEmail = jest.fn();
export const updateProfile = jest.fn();

// Minimal surface used by `./config` typings re-exports — keep permissive on purpose for tests.
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace FirebaseAuthTypes {
  export type User = {
    uid: string;
    email: string | null;
    displayName: string | null;
  };
}

export function getAuth() {
  return {
    currentUser: null,
  };
}
