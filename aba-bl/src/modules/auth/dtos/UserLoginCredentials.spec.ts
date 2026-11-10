import { UserLoginCredentialsDto } from './UserLoginCredentials';

describe('UserLoginCredentialsDto', () => {
  it('accepts a valid username/password payload', () => {
    const result = UserLoginCredentialsDto.safeParse({
      username: 'testuser',
      password: 'password123',
    });

    expect(result.success).toBe(true);
  });

  it('accepts a valid email/password payload', () => {
    const result = UserLoginCredentialsDto.safeParse({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(result.success).toBe(true);
  });

  it('rejects a payload missing both username and email', () => {
    const result = UserLoginCredentialsDto.safeParse({
      password: 'password123',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'Either username or email must be provided.',
      );
    }
  });

  it('rejects a password shorter than 8 characters', () => {
    const result = UserLoginCredentialsDto.safeParse({
      username: 'testuser',
      password: 'short',
    });

    expect(result.success).toBe(false);
  });

  it('rejects an invalid email format', () => {
    const result = UserLoginCredentialsDto.safeParse({
      email: 'not-an-email',
      password: 'password123',
    });

    expect(result.success).toBe(false);
  });

  it('rejects a username shorter than 3 characters', () => {
    const result = UserLoginCredentialsDto.safeParse({
      username: 'ab',
      password: 'password123',
    });

    expect(result.success).toBe(false);
  });
});
