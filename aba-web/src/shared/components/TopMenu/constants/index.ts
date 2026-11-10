import type { AppBarPage, AppBarSetting } from "@/shared/types/components/appBar";
import { UrlMapper } from "@/shared/types/URLMapper";

export const TopMenuPages: AppBarPage[] = [
  { name: "Home", path: "/" },
  { name: "About", path: "/about" },
  { name: "Services", path: "/services" },
  { name: "Pricing", path: "/pricing" },
  { name: "Contact", path: "/contact" },
];

export const TopMenuGuestPages: AppBarPage[] = [
  { name: "Login", path: "/login" },
  { name: "Register", path: "/register" },
];



export const TopMenuSettings = [
  { name: "Profile", path: "/profile" },
  { name: "Settings", path: "/settings" },
];

// Mirrors the sections available in CompanySidebar so the same
// destinations are reachable from the top-right profile menu too.
export const buildCompanyMenuSettings = (
  companyId: string,
  canManageUsers: boolean,
): AppBarSetting[] => [
  { name: "Dashboard", path: `/company/${companyId}` },
  { name: "Business Details", path: `/company/${companyId}/details` },
  { name: "Teams", path: `/company/${companyId}/teams` },
  { name: "Environments", path: `/company/${companyId}/environments` },
  ...(canManageUsers
    ? [{ name: "Users", path: `/company/${companyId}/users` }]
    : []),
  { name: "Pricing & Plans", path: UrlMapper.PRICING },
];

// Mirrors the sections available in AdminSidebar.
export const TopMenuAdminSettings: AppBarSetting[] = [
  { name: "Admin Dashboard", path: UrlMapper.ADMIN },
  { name: "Customer List", path: UrlMapper.ADMIN_CUSTOMERS },
];

export const TopMenuSettingsTitle = "Settings";

export const TopMenuLogoText = "Example Text";

export const TopMenuLogoPath = "#";

export const TopMenuProfile = {
  title: "User Profile",
  avatar: "https://example.com/avatar.jpg", // Replace with actual avatar URL
};