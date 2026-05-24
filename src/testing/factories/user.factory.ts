import type {AuthUser} from '@app-types/user';

export const buildAuthUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  uid: 'user-1',
  email: 'ada@example.com',
  displayName: 'Ada',
  ...overrides,
});
