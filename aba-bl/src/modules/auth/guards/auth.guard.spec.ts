import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';
import { jwtConstants } from '@/shared/constants/jwtConstants';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: jest.Mocked<JwtService>;

  const createContext = (request: Record<string, unknown>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;
    guard = new AuthGuard(jwtService);
  });

  it('returns true and attaches the decoded payload to the request for a valid Bearer token', async () => {
    const payload = {
      sub: '1',
      username: 'user@example.com',
      role: 'BUSINESS_OWNER',
    };
    jwtService.verifyAsync.mockResolvedValue(payload);
    const request: Record<string, unknown> = {
      headers: { authorization: 'Bearer valid-token' },
    };

    const result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
      secret: jwtConstants.accessSecret,
    });
    expect(request['user']).toEqual(payload);
  });

  it('throws UnauthorizedException when the authorization header is missing', async () => {
    const request: Record<string, unknown> = { headers: {} };

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when the authorization scheme is not Bearer', async () => {
    const request: Record<string, unknown> = {
      headers: { authorization: 'Basic some-credentials' },
    };

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when the token fails verification', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid signature'));
    const request: Record<string, unknown> = {
      headers: { authorization: 'Bearer bad-token' },
    };

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(request['user']).toBeUndefined();
  });
});
