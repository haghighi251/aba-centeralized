export type DependencyEcosystem =
  | "NPM"
  | "PYPI"
  | "MAVEN"
  | "RUBYGEMS"
  | "NUGET"
  | "GO"
  | "OTHER";

export type ServicePackageStatus = "ACTIVE" | "STALE" | "REMOVED";

export interface Package {
  id: number;
  ecosystem: DependencyEcosystem;
  name: string;
  version: string;
  createdAt: string;
}

export interface ServicePackageNotificationState {
  muted: boolean;
  mutedAt: string | null;
  lastNotifiedAt: string | null;
  nextNotifyAt: string | null;
}

export interface ServicePackage {
  id: number;
  status: ServicePackageStatus;
  versionRange: string | null;
  introducedAt: string;
  deactivatedAt: string | null;
  alarmCount: number;
  lastAlarmAt: string | null;
  serviceId: number;
  packageId: number;
  package: Package;
  notificationState?: ServicePackageNotificationState | null;
  createdAt: string;
  updatedAt: string;
}

export type UpdateNotificationPreferencePayload =
  | { action: "MUTE" }
  | { action: "UNMUTE" }
  | { action: "SNOOZE"; until: string };

export interface PackageFilter {
  search?: string;
  ecosystem?: DependencyEcosystem;
  sortBy?: "name" | "introducedAt";
  sortOrder?: "asc" | "desc";
}

export interface PackageHistoryFilter {
  search?: string;
  status?: "STALE" | "REMOVED" | "ALL";
  sortBy?: "name" | "deactivatedAt";
  sortOrder?: "asc" | "desc";
}

export interface GetServicePackagesResult {
  data: ServicePackage[];
  total: number;
}

export interface CreatePackagePayload {
  name: string;
  version: string;
  versionRange?: string | null;
  ecosystem?: DependencyEcosystem;
}

export interface UpdatePackagePayload {
  version?: string;
  versionRange?: string | null;
  ecosystem?: DependencyEcosystem;
}

export interface BulkPackageItem {
  name: string;
  version: string;
  versionRange?: string;
}

export interface BulkImportPayload {
  ecosystem?: DependencyEcosystem;
  packages: BulkPackageItem[];
}

export interface BulkImportResult {
  added: number;
  updated: number;
  unchanged: number;
  staled: number;
}
