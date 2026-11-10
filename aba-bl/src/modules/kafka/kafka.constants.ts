/**
 * Kafka topic names shared with `worker`. See root CLAUDE.md for the full
 * set of topics documented for the platform.
 */
export const KAFKA_TOPICS = {
  PACKAGE_SCAN: 'package.scan',
  VULNERABILITY_FETCHED: 'vulnerability.fetched',
  /**
   * Produced by aba-bl whenever a scan (manual or scheduled) finds a
   * vulnerability affecting a service's active packages, replacing the old
   * direct synchronous email call. Consumed by worker, which owns tracking
   * state and the daily digest send — see
   * src/modules/kafka/types/vulnerabilityNotificationMessages.ts.
   */
  VULNERABILITY_NOTIFICATION_PENDING: 'vulnerability.notification.pending',
  /**
   * Produced by aba-bl's TestRun module when a run is triggered (manual now;
   * scheduled/webhook later). Consumed by worker's Test Executor, which runs
   * each definition and replies on TEST_RESULT. Carries only run/target/
   * definition metadata — never auth secrets (the worker fetches those from
   * the internal materials endpoint). See types/testRunMessages.ts.
   */
  TEST_SCHEDULED: 'test.scheduled',
  /**
   * Produced by worker's Test Executor with per-definition outcomes, consumed
   * by aba-bl's TestResultConsumerService to persist TestResults and finalise
   * the TestRun. See types/testRunMessages.ts.
   */
  TEST_RESULT: 'test.result',
} as const;

/**
 * Consumer group id for the vulnerability.fetched consumer. Kept as a
 * constant so tests and the real consumer never drift apart.
 */
export const VULNERABILITY_FETCHED_CONSUMER_GROUP =
  'aba-bl-vulnerability-fetched';

/**
 * Consumer group id for the test.result consumer (aba-bl side).
 */
export const TEST_RESULT_CONSUMER_GROUP = 'aba-bl-test-result';
