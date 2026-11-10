export type RepositoryProvider = "GITHUB" | "BITBUCKET";
export type RepositoryConnectionStatus = "ACTIVE" | "PAUSED";
export type RepositoryTriggerMode = "INSTANT" | "PUSH_COUNT" | "TIME_INTERVAL";

/** Redacted connection status — never carries the webhook token or secret. */
export interface RepositoryConnection {
  id: number;
  provider: RepositoryProvider;
  owner: string;
  name: string;
  watchedBranch: string;
  status: RepositoryConnectionStatus;
  lastPingedAt: string | null;
  lastTriggeredAt: string | null;
  triggerMode: RepositoryTriggerMode;
  pushCountThreshold: number | null;
  intervalDays: number | null;
  pendingPushCount: number;
  serviceId: number;
  connectedById: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRepositoryConnectionPayload {
  // Omitted means GITHUB on the API side.
  provider?: RepositoryProvider;
  owner: string;
  name: string;
  watchedBranch?: string;
  // Omit all three to let the API compute a default from the company's
  // plan + whether this service's environment is production.
  triggerMode?: RepositoryTriggerMode;
  pushCountThreshold?: number;
  intervalDays?: number;
}

export interface UpdateTriggerSettingsPayload {
  triggerMode: RepositoryTriggerMode;
  pushCountThreshold?: number;
  intervalDays?: number;
}

/**
 * Returned only once, right after create/rotate-secret — the API never
 * re-exposes the plaintext secret afterward.
 */
export interface RepositoryConnectionSecretReveal {
  connection: RepositoryConnection;
  webhookUrl: string;
  webhookSecret: string;
}
