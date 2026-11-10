import { RefreshTokenDto } from './RefreshTokenDto';

describe('RefreshTokenDto', () => {
  it('accepts a valid refresh token', () => {
    const result = RefreshTokenDto.safeParse({
      refreshToken: 'some-refresh-token',
    });

    expect(result.success).toBe(true);
  });

  it('rejects an empty refresh token', () => {
    const result = RefreshTokenDto.safeParse({ refreshToken: '' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Refresh token is required.');
    }
  });

  it('rejects a missing refresh token', () => {
    const result = RefreshTokenDto.safeParse({});

    expect(result.success).toBe(false);
  });
});
