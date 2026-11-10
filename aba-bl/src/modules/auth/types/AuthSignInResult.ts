export type AuthSignInResult = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    companyId: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    accessTokenExpires: number;
  };
};
