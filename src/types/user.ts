export type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
};

/** Stored on Firestore user doc (`users/{uid}.role`). */
export type UserRole = 'client' | 'admin';

export const DEFAULT_USER_ROLE = 'client' satisfies UserRole;

export type UserStats = {
  meetingsCreated: number;
  meetingsEdited: number;
  meetingsDeleted: number;
};

export const emptyUserStats = (): UserStats => ({
  meetingsCreated: 0,
  meetingsEdited: 0,
  meetingsDeleted: 0,
});
