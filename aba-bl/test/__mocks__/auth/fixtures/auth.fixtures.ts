import { AuthSignInResult } from '@/modules/auth/types/AuthSignInResult';

export const mockAuthSignInResult: AuthSignInResult = {
  user: {
    id: '1',
    name: 'Alice Owner',
    email: 'alice@acme.com',
    role: 'BUSINESS_OWNER',
    companyId: '1',
  },
  tokens: {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    accessTokenExpires: Math.floor(Date.now() / 1000) + 3600,
  },
};

export const mockRefreshTokenResult = {
  access_token: 'mock-new-access-token',
  refresh_token: 'mock-new-refresh-token',
};

export const mockLoginCredentials = {
  email: 'alice@acme.com',
  password: 'password123',
};

export const mockJwtPayload = {
  sub: '1',
  username: 'alice@acme.com',
  role: 'BUSINESS_OWNER',
  companyId: '1',
};
