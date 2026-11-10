import { TestPage } from '@aba/database';

/**
 * Customer-facing shape of a TestPage. Deliberately omits `authSecretEnc`
 * and replaces it with a boolean `hasAuthSecret` so the encrypted credential
 * never leaves the service. Everything else is passed through unchanged.
 */
export interface TestPageView {
  id: number;
  name: string;
  description: string | null;
  pageType: TestPage["pageType"];
  path: string | null;
  absoluteUrl: string | null;
  method: string;
  status: TestPage['status'];
  accessConfig: TestPage['accessConfig'];
  authKind: TestPage['authKind'];
  hasAuthSecret: boolean;
  scheduleEnabled: boolean;
  scheduleIntervalHours: number | null;
  nextScheduledAt: Date | null;
  runOnWebhook: boolean;
  serviceId: number;
  createdAt: Date;
  updatedAt: Date;
}

export function toTestPageView(target: TestPage): TestPageView {
  return {
    id: target.id,
    name: target.name,
    description: target.description,
    pageType: target.pageType,
    path: target.path,
    absoluteUrl: target.absoluteUrl,
    method: target.method,
    status: target.status,
    accessConfig: target.accessConfig,
    authKind: target.authKind,
    hasAuthSecret: Boolean(target.authSecretEnc),
    scheduleEnabled: target.scheduleEnabled,
    scheduleIntervalHours: target.scheduleIntervalHours,
    nextScheduledAt: target.nextScheduledAt,
    runOnWebhook: target.runOnWebhook,
    serviceId: target.serviceId,
    createdAt: target.createdAt,
    updatedAt: target.updatedAt,
  };
}
