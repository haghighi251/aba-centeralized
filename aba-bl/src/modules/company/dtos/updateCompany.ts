import { CompanyStatus } from '@aba/database';

export type TUpdateCompany = {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  website?: string | null;
  status?: CompanyStatus;
  subscriptionPlanId?: number | null;
  payAsYouGo?: boolean;
};
