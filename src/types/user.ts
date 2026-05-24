export type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
};

/** Rows from Firestore `/users/{uid}` for invite pickers — keep in sync with `ensureUserDoc` fields. */
export type AssignableDirectoryUser = {
  uid: string;
  email: string;
  displayName: string;
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
