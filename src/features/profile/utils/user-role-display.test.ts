import {userRoleLabel} from './user-role-display';

describe('userRoleLabel', () => {
  it('maps known roles to UX copy', () => {
    expect(userRoleLabel('client')).toBe('Client');
    expect(userRoleLabel('admin')).toBe('Admin');
  });

  it('defaults unknown/absent roles to member', () => {
    expect(userRoleLabel(null)).toBe('Member');
  });
});
