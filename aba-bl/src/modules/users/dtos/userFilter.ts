import { UserStatus } from '@aba/database';

export type TUserFilter = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: UserStatus;
  email?: string;
  phone?: string;
};
