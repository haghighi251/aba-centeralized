import { Consumer } from 'kafkajs';
import {
  createKafkaConsumer,
  KAFKA_TOPICS,
  TEST_SCHEDULED_CONSUMER_GROUP,
} from '@/infrastructure/kafka/kafkaClient';
import { publishTestResult } from '@/infrastructure/kafka/producers/testResultProducer';
import { fetchTestRunMaterials } from '@/infrastructure/http/bffMaterialsClient';
import {
  TestResultItem,
  TestResultMessage,
  TestScheduledMessage,
  TestScheduledDefinition,
  TestScheduledTarget,
} from '@/infrastructure/kafka/types/testRunMessages';
import {
  HttpTestExecutor,
  TestExecutor,
} from '@domain/services/testExecutor';

let consumer: Consumer | null = null;

/** Registered engines, tried in order. Playwright joins this in Phase 2. */
const executors: TestExecutor[] = [new HttpTestExecutor()];

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

/**
 * The Test Executor Worker: consumes test.scheduled, runs each target's
 * definitions (in-process axios for CUSTOM_API; others are skipped until
 * their engine ships), and publishes a single test.result per run. Auth
 * secrets are fetched from aba-bl's internal materials endpoint, never read
 * off the Kafka message.
 */
export async function startTestScheduledConsumer(): Promise<void> {
  consumer = createKafkaConsumer(TEST_SCHEDULED_CONSUMER_GROUP);
  await consumer.connect();
  await consumer.subscribe({
    topic: KAFKA_TOPICS.TEST_SCHEDULED,
    fromBeginning: false,
  });
  await consumer.run({
    eachMessage: async ({ message }) =>
      handleTestScheduledMessage(message.value?.toString() ?? null),
  });
}

export async function stopTestScheduledConsumer(): Promise<void> {
  if (consumer) {
    await consumer.disconnect().catch((error) => {
      console.error(
        '[Worker] Failed to disconnect test.scheduled consumer:',
        error?.message,
      );
    });
    consumer = null;
  }
}

/**
 * Exported separately so tests can drive it with a constructed body. Never
 * throws — a bad message is logged and dropped; a publish failure is logged.
 */
export async function handleTestScheduledMessage(
  raw: string | null,
): Promise<void> {
  if (!raw) {
    console.error('[Worker] Received empty test.scheduled message, skipping');
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.error(
      '[Worker] Received malformed (non-JSON) test.scheduled message, skipping:',
      (error as Error)?.message,
    );
    return;
  }

  if (!isValidTestScheduledMessage(parsed)) {
    console.error(
      '[Worker] Received test.scheduled message with unexpected shape, skipping',
    );
    return;
  }

  const results = await runScheduledTests(parsed);

  const summary = {
    total: results.length,
    passed: results.filter((r) => r.status === 'PASSED').length,
    failed: results.filter((r) => r.status === 'FAILED').length,
    error: results.filter((r) => r.status === 'ERROR').length,
  };

  const message: TestResultMessage = {
    runKey: parsed.runKey,
    companyId: parsed.companyId,
    serviceId: parsed.serviceId,
    results,
    summary,
  };

  try {
    await publishTestResult(message);
  } catch (error) {
    console.error(
      `[Worker] Failed to publish test.result for runKey=${parsed.runKey}:`,
      (error as Error)?.message,
    );
  }
}

/** Runs every definition across every target, honouring the rate limit. */
async function runScheduledTests(
  msg: TestScheduledMessage,
): Promise<TestResultItem[]> {
  const materials = await fetchTestRunMaterials(msg.runKey);
  const secretByTarget = new Map<number, string | null>();
  for (const t of materials?.targets ?? []) {
    secretByTarget.set(t.targetId, t.authSecret);
  }

  const minIntervalMs = rateLimitIntervalMs(msg.rateLimitConfig);
  const results: TestResultItem[] = [];
  let first = true;

  for (const target of msg.targets) {
    const authSecret = secretByTarget.get(target.targetId) ?? null;
    for (const definition of target.definitions) {
      if (!first && minIntervalMs > 0) {
        await sleep(minIntervalMs);
      }
      first = false;
      results.push(...(await runOne(target, definition, msg.baseUrl, authSecret)));
    }
  }

  return results;
}

async function runOne(
  target: TestScheduledTarget,
  definition: TestScheduledDefinition,
  baseUrl: string,
  authSecret: string | null,
): Promise<TestResultItem[]> {
  const executor = executors.find((e) => e.canRun(definition));
  if (!executor) {
    return [
      {
        definitionId: definition.definitionId,
        name: definition.name,
        status: 'SKIPPED',
        durationMs: null,
        request: null,
        response: null,
        assertionResults: null,
        errorMessage: `No executor for ${definition.type}/${definition.engine} yet (coming in a later phase).`,
      },
    ];
  }
  try {
    return await executor.run(target, definition, {
      baseUrl,
      authSecret,
      timeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
    });
  } catch (error) {
    return [
      {
        definitionId: definition.definitionId,
        name: definition.name,
        status: 'ERROR',
        durationMs: null,
        request: null,
        response: null,
        assertionResults: null,
        errorMessage: (error as Error)?.message ?? 'Executor failed.',
      },
    ];
  }
}

/** Minimum ms between requests to stay within { windowMs, max }. */
export function rateLimitIntervalMs(
  rateLimitConfig: { windowMs: number; max: number } | null,
): number {
  if (
    !rateLimitConfig ||
    !rateLimitConfig.max ||
    rateLimitConfig.max <= 0 ||
    !rateLimitConfig.windowMs ||
    rateLimitConfig.windowMs <= 0
  ) {
    return 0;
  }
  return Math.ceil(rateLimitConfig.windowMs / rateLimitConfig.max);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isValidTestScheduledMessage(
  value: unknown,
): value is TestScheduledMessage {
  if (!value || typeof value !== 'object') return false;
  const msg = value as Record<string, unknown>;
  return (
    typeof msg.runKey === 'string' &&
    typeof msg.serviceId === 'number' &&
    typeof msg.companyId === 'number' &&
    typeof msg.baseUrl === 'string' &&
    Array.isArray(msg.targets)
  );
}
