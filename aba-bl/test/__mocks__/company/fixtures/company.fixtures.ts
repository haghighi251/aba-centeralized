import {
  Company,
  CompanyStatus,
  User,
  UserRole,
  UserStatus,
} from '@aba/database';

export const mockCompany: Company = {
  id: 1,
  username: 'acme',
  email: 'acme@example.com',
  address: '123 Main St',
  city: 'Metropolis',
  state: 'NY',
  country: 'USA',
  postalCode: '10001',
  website: 'https://acme.com',
  status: CompanyStatus.ACTIVE,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
} as Company;

export const mockOtherCompany: Company = {
  ...mockCompany,
  id: 2,
  username: 'globex',
  email: 'globex@example.com',
};

export const mockOwnerUser: User = {
  id: 10,
  email: 'owner@acme.com',
  password: 'hashed-owner-password',
  firstName: 'Alice',
  lastName: 'Owner',
  phone: null,
  avatar: null,
  role: UserRole.BUSINESS_OWNER,
  status: UserStatus.ACTIVE,
  lastLogin: null,
  resetToken: null,
  resetTokenExpiry: null,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  companyId: 1,
} as User;

export const mockAdminUser: User = {
  ...mockOwnerUser,
  id: 11,
  email: 'admin@acme.com',
  firstName: 'Bob',
  lastName: 'Admin',
  role: UserRole.BUSINESS_ADMIN,
};

export const mockMemberUser: User = {
  ...mockOwnerUser,
  id: 12,
  email: 'member@acme.com',
  firstName: 'Carol',
  lastName: 'Member',
  role: UserRole.BUSINESS_MEMBER,
  resetToken: 'some-reset-token',
  resetTokenExpiry: new Date('2024-02-01T00:00:00.000Z'),
};

export const mockOwnerJwtPayload: {
  sub: number;
  username: string;
  role: UserRole;
  companyId: number;
} = {
  sub: mockOwnerUser.id,
  username: mockOwnerUser.email,
  role: mockOwnerUser.role,
  companyId: mockOwnerUser.companyId,
};

export const mockAdminJwtPayload: {
  sub: number;
  username: string;
  role: UserRole;
  companyId: number;
} = {
  sub: mockAdminUser.id,
  username: mockAdminUser.email,
  role: mockAdminUser.role,
  companyId: mockAdminUser.companyId,
};

export const mockMemberJwtPayload: {
  sub: number;
  username: string;
  role: UserRole;
  companyId: number;
} = {
  sub: mockMemberUser.id,
  username: mockMemberUser.email,
  role: mockMemberUser.role,
  companyId: mockMemberUser.companyId,
};

export const mockOtherCompanyOwnerJwtPayload = {
  sub: 99,
  username: 'intruder@globex.com',
  role: UserRole.BUSINESS_OWNER,
  companyId: mockOtherCompany.id,
};

export const validRegisterCompanyPayload = {
  username: 'newcompany',
  email: 'new-company@example.com',
  website: 'https://new-company.example.com',
  password: 'StrongPass123',
  firstName: 'Dana',
  lastName: 'Founder',
};

export const validAddCompanyUserPayload = {
  email: 'new.user@acme.com',
  role: 'BUSINESS_MEMBER' as const,
  password: 'StrongPass123',
  firstName: 'New',
  lastName: 'User',
};
