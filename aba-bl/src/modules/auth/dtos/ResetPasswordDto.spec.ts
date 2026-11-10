import { ResetPasswordDto } from './ResetPasswordDto';

describe('ResetPasswordDto', () => {
  it('accepts a valid token and password', () => {
    const result = ResetPasswordDto.safeParse({
      token: 'reset-token',
      password: 'newpassword123',
    });

    expect(result.success).toBe(true);
  });

  it('rejects an empty token', () => {
    const result = ResetPasswordDto.safeParse({
      token: '',
      password: 'newpassword123',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Token is required.');
    }
  });

  it('rejects a password shorter than 8 characters', () => {
    const result = ResetPasswordDto.safeParse({
      token: 'reset-token',
      password: 'short',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'Password must be at least 8 characters.',
      );
    }
  });
});
