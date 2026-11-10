"use client";
import { useThemeContext } from '@/shared/contexts/ThemeContext';
import AppBar from "@/components/AppBar/AppBar";
import { signOut, useSession } from "next-auth/react";
import {
  TopMenuLogoPath,
  TopMenuLogoText,
  TopMenuPages,
  TopMenuGuestPages,
  TopMenuSettings,
  TopMenuSettingsTitle,
  TopMenuProfile,
  TopMenuAdminSettings,
  buildCompanyMenuSettings,
} from "./constants";

const BUSINESS_ROLES = ["BUSINESS_OWNER", "BUSINESS_ADMIN", "BUSINESS_MEMBER"];
const BUSINESS_MANAGER_ROLES = ["BUSINESS_OWNER", "BUSINESS_ADMIN"];
const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];

const getDashboardSettings = (role?: string, companyId?: string) => {
  if (companyId && role && BUSINESS_ROLES.includes(role)) {
    return buildCompanyMenuSettings(companyId, BUSINESS_MANAGER_ROLES.includes(role));
  }
  if (role && ADMIN_ROLES.includes(role)) {
    return TopMenuAdminSettings;
  }
  return [];
};

const TopMenu = () => {
  const { data: session } = useSession();
  const { mode, toggleTheme } = useThemeContext();

  const user = session?.user as { role?: string; companyId?: string } | undefined;
  const dashboardSettings = getDashboardSettings(user?.role, user?.companyId);

  const pages = session
    ? TopMenuPages
    : [...TopMenuPages, ...TopMenuGuestPages];

  const settings = [
    ...(session
      ? [
          ...dashboardSettings,
          ...TopMenuSettings,
          { name: session.user?.name ?? "Account", path: "/profile" },
          { name: "Logout", path: "#", onClick: () => signOut({ callbackUrl: "/" }) },
        ]
      : []),
    {
      name: mode === "light" ? "🌙 Dark Mode" : "☀️ Light Mode",
      path: "#",
      onClick: toggleTheme,
    },
  ];

  const profile = session
    ? { ...TopMenuProfile, title: session.user?.name ?? TopMenuProfile.title }
    : TopMenuProfile;

  return (
    <AppBar
      logoText={TopMenuLogoText}
      logoPath={TopMenuLogoPath}
      pages={pages}
      settings={settings}
      settingsTitle={TopMenuSettingsTitle}
      profile={profile}
      profileLabel={session?.user?.name ?? undefined}
    />
  );
};

export default TopMenu;
