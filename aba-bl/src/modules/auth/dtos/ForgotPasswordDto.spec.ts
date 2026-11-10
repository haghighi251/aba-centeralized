import { ForgotPasswordDto } from './ForgotPasswordDto';

describe('ForgotPasswordDto', () => {
  it('accepts a valid email', () => {
    const result = ForgotPasswordDto.safeParse({ email: 'user@example.com' });

    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = ForgotPasswordDto.safeParse({ email: 'not-an-email' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Invalid email address.');
    }
  });

  it('rejects a missing email', () => {
    const result = ForgotPasswordDto.safeParse({});

    expect(result.success).toBe(false);
  });
});
