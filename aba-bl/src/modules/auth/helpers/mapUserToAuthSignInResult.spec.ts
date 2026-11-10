import { User, UserRole, UserStatus } from '@aba/database';
import { mapUserToAuthSignInResult } from './mapUserToAuthSignInResult';

describe('mapUserToAuthSignInResult', () => {
  const baseUser: User = {
    id: 1,
    email: 'testuser@example.com',
    password: '$2b$10$hash',
    firstName: 'Test',
    lastName: 'User',
    phone: '+1234567890',
    avatar: '',
    role: UserRole.BUSINESS_OWNER,
    status: UserStatus.ACTIVE,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastLogin: new Date('2024-01-01'),
    companyId: 1,
    resetToken: null,
    resetTokenExpiry: null,
  };

  it('maps a user to the AuthSignInResult user shape', () => {
    const result = mapUserToAuthSignInResult(baseUser);

    expect(result).toEqual({
      id: '1',
      name: 'Test',
      email: 'testuser@example.com',
      role: UserRole.BUSINESS_OWNER,
      companyId: '1',
    });
  });

  it('falls back to the email when firstName is not set', () => {
    const result = mapUserToAuthSignInResult({ ...baseUser, firstName: null });

    expect(result.name).toBe(baseUser.email);
  });
});
