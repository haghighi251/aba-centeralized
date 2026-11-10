const verifyIdTokenMock = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: verifyIdTokenMock,
  })),
}));

import { verifyGoogleIdToken } from './verifyGoogleIdToken';

describe('verifyGoogleIdToken', () => {
  beforeEach(() => {
    verifyIdTokenMock.mockReset();
  });

  it('returns the token payload for a valid Google ID token', async () => {
    const payload = { sub: 'google-user-id', email: 'user@example.com' };
    verifyIdTokenMock.mockResolvedValue({ getPayload: () => payload });

    const result = await verifyGoogleIdToken('valid-id-token');

    expect(verifyIdTokenMock).toHaveBeenCalledWith({
      idToken: 'valid-id-token',
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    expect(result).toEqual(payload);
  });

  it.each([undefined, '', '   ', 123 as unknown as string])(
    'throws an Error for an invalid id token value (%p)',
    async (idToken) => {
      await expect(verifyGoogleIdToken(idToken as string)).rejects.toThrow(
        'Invalid Google ID token',
      );
      expect(verifyIdTokenMock).not.toHaveBeenCalled();
    },
  );

  it('propagates errors thrown by the Google OAuth client', async () => {
    verifyIdTokenMock.mockRejectedValue(new Error('token expired'));

    await expect(verifyGoogleIdToken('expired-token')).rejects.toThrow(
      'token expired',
    );
  });
});
