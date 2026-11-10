import { DependencyEcosystem } from '@aba/database';
import { OsvVuln } from '@/modules/service-package/services/osv.service';

/**
 * Wire contract for the `package.scan` topic.
 *
 * Produced by aba-bl's PackageRescanScheduler, consumed by worker's
 * Vulnerability Fetcher Worker. Both sides must keep this shape in sync —
 * there is no shared npm package for Kafka contracts in this monorepo, so
 * the same interface is duplicated (not imported) on the worker side in
 * `worker/src/infrastructure/kafka/types/packageScanMessages.ts`.
 */
export interface PackageScanMessage {
  /** Correlates a package.scan request with its vulnerability.fetched reply. */
  scanId: string;
  companyId: number;
  serviceId: number;
  packages: {
    id: number;
    ecosystem: DependencyEcosystem;
    name: string;
    version: string;
  }[];
}

/**
 * Wire contract for the `vulnerability.fetched` topic.
 *
 * Produced by worker after querying OSV.dev, consumed by aba-bl's
 * VulnerabilityFetchedConsumerService to persist findings and notify.
 */
export interface VulnerabilityFetchedMessage {
  scanId: string;
  companyId: number;
  serviceId: number;
  results: {
    packageId: number;
    ecosystem: DependencyEcosystem;
    name: string;
    version: string;
    vulns: OsvVuln[];
  }[];
}
