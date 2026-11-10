/**
 * Decrypted auth material the executor needs for a run, returned ONLY via the
 * internal materials endpoint (INTERNAL_API_KEY-guarded), keyed by runKey.
 * Never exposed on any customer-facing route and never placed on Kafka.
 */
export interface TestRunMaterials {
  runKey: string;
  targets: {
    targetId: number;
    authKind: string;
    /** Decrypted credential, or null when authKind is NONE / no secret stored. */
    authSecret: string | null;
  }[];
}
