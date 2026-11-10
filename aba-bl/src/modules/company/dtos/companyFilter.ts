import { CompanyStatus } from '@aba/database';

export type TCompanyFilter = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: CompanyStatus;
  email?: string;
  name?: string;
};
