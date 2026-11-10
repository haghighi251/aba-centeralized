import { UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import { verifyGithubAccessToken } from './verifyGithubAccessToken';

jest.mock('axios');

describe('verifyGithubAccessToken', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  it('returns the GitHub user payload for a valid access token', async () => {
    const githubUser = { id: 123, email: 'user@example.com', login: 'octocat' };
    mockedAxios.get.mockResolvedValue({ data: githubUser });

    const result = await verifyGithubAccessToken('valid-access-token');

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://api.github.com/user',
      {
        headers: { Authorization: 'Bearer valid-access-token' },
      },
    );
    expect(result).toEqual(githubUser);
  });

  it.each([undefined, '', '   ', 123 as unknown as string])(
    'throws UnauthorizedException for an invalid access token value (%p)',
    async (accessToken) => {
      await expect(
        verifyGithubAccessToken(accessToken as string),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    },
  );

  it('throws UnauthorizedException when the GitHub API request fails', async () => {
    mockedAxios.get.mockRejectedValue(new Error('network error'));

    await expect(verifyGithubAccessToken('valid-access-token')).rejects.toThrow(
      'Token verification failed: Invalid GitHub access token.',
    );
  });
});
