import {createEditProfileSchema} from './edit-profile.schema';

describe('createEditProfileSchema', () => {
  const initialEmailLower = 'ada@example.com';

  it('allows display-only edits without current password', () => {
    const schema = createEditProfileSchema(initialEmailLower);
    expect(
      schema.safeParse({
        displayName: 'Ada',
        email: 'ada@example.com',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }).success,
    ).toBe(true);
  });

  it('requires current password when email changes', () => {
    const schema = createEditProfileSchema(initialEmailLower);
    const parsed = schema.safeParse({
      displayName: 'Ada',
      email: 'new@example.com',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.flatten().fieldErrors.currentPassword?.length).toBeGreaterThan(0);
    }
  });

  it('validates new password flow when provided', () => {
    const schema = createEditProfileSchema(initialEmailLower);
    const bad = schema.safeParse({
      displayName: 'Ada',
      email: 'ada@example.com',
      currentPassword: 'cur',
      newPassword: 'short',
      confirmPassword: 'short',
    });
    expect(bad.success).toBe(false);

    const mismatch = schema.safeParse({
      displayName: 'Ada',
      email: 'ada@example.com',
      currentPassword: 'cur',
      newPassword: 'Longenough1!',
      confirmPassword: 'Longenough1@',
    });
    expect(mismatch.success).toBe(false);
    if (!mismatch.success) {
      expect(mismatch.error.flatten().fieldErrors.confirmPassword?.length).toBeGreaterThan(0);
    }
  });
});
