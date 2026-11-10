import { UnauthorizedException } from '@nestjs/common';
import axios from 'axios';

// const githubPublicKeysUrl = `https://api.github.com/applications/${process.env.AUTH_GITHUB_ID}/token`;

export async function verifyGithubAccessToken(
  accessToken: string,
): Promise<unknown> {
  try {
    const isValidToken =
      typeof accessToken === 'string' && accessToken.trim() !== '';
    if (!isValidToken) {
      throw new Error('Invalid Github ID token');
    }
    // Make a request to GitHub's user API to verify the token
    const response = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // The response will contain user information if the token is valid
    const user = response.data;

    return user;
  } catch (error) {
    throw new UnauthorizedException(
      'Token verification failed: Invalid GitHub access token.',
    );
  }
}
