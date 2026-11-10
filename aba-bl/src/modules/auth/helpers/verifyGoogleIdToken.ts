import { OAuth2Client, TokenPayload } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function verifyGoogleIdToken(
  idToken: string,
): Promise<TokenPayload | Error> {
  const isValidToken = typeof idToken === 'string' && idToken.trim() !== '';
  if (!isValidToken) {
    throw new Error('Invalid Google ID token');
  }
  const ticket = await client.verifyIdToken({
    idToken: idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  // If request specified a G Suite domain:
  // const domain = payload['hd'];

  return payload;
}
