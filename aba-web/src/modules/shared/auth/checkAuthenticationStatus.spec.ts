import { userIsAuthorized } from './checkAuthenticationStatus';
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

// Mock the modules
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

describe('userIsAuthorized', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to sign-in if user is not authorized', async () => {
    getServerSession.mockResolvedValueOnce(null);

    await userIsAuthorized();

    expect(redirect).toHaveBeenCalledWith('/api/auth/signin');
  });

  it('does nothing if user is authorized', async () => {
    getServerSession.mockResolvedValueOnce({ user: { name: 'Test User', email: 'test@example.com' } });

    await userIsAuthorized();

    expect(redirect).not.toHaveBeenCalled();
  });
});