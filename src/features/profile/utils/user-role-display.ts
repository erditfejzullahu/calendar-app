import type {UserRole} from '@app-types/user';

export const userRoleLabel = (role: UserRole | null): string => {
  if (role === 'client') return 'Client';
  if (role === 'admin') return 'Admin';
  return 'Member';
};
