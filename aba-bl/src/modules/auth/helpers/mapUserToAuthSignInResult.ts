import { User } from '@aba/database';
import { AuthSignInResult } from '@/modules/auth/types/AuthSignInResult';

export function mapUserToAuthSignInResult(
  user: User,
): AuthSignInResult['user'] {
  return {
    id: user.id.toString(),
    name: user.firstName ?? user.email,
    email: user.email,
    role: user.role,
    companyId: user.companyId.toString(),
  };
}
