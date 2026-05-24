import {signInSchema, signUpSchema} from './auth.schemas';

describe('signInSchema', () => {
  it('requires a valid email and non-empty password', () => {
    expect(
      signInSchema.safeParse({email: ' bad@example.com ', password: 'secret'}).success,
    ).toBe(true);
    expect(signInSchema.safeParse({email: 'not-an-email', password: 'x'}).success).toBe(false);
    expect(signInSchema.safeParse({email: 'a@b.co', password: ''}).success).toBe(false);
  });
});

describe('signUpSchema', () => {
  const base = {
    displayName: 'Ada Lovelace',
    email: 'ada@example.com',
    password: 'Str0ng!pass',
    confirm: 'Str0ng!pass',
  };

  it('accepts a strong password with all required character classes', () => {
    expect(signUpSchema.safeParse(base).success).toBe(true);
  });

  it('rejects short display names', () => {
    expect(signUpSchema.safeParse({...base, displayName: 'A'}).success).toBe(false);
  });

  it('rejects weak passwords missing complexity rules', () => {
    expect(signUpSchema.safeParse({...base, password: 'alllowercase1!', confirm: 'alllowercase1!'}).success).toBe(
      false,
    );
  });

  it('rejects mismatched confirmation', () => {
    const parsed = signUpSchema.safeParse({...base, confirm: 'Str0ng!pasz'});
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.flatten().fieldErrors.confirm?.length).toBeGreaterThan(0);
    }
  });
});
