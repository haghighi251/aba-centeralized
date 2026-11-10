export const jwtConstants = {
  accessSecret:
    process.env.ACCESS_TOKEN_SECRET ||
    'd3f4e6a7b8c9d0e1f2a3b4c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6y7z8',
  refreshSecret:
    process.env.REFRESH_TOKEN_SECRET ||
    'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4',
  accessTokenExpiresIn: '60m',
  refreshTokenExpiresIn: '30d',
};
