import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Consumer } from 'kafkajs';
import {
  Prisma,
  TestResultStatus,
  TestRunStatus,
} from '@aba/database';
import { KafkaClientService } from '@/modules/kafka/services/kafkaClient.service';
import {
  KAFKA_TOPICS,
  TEST_RESULT_CONSUMER_GROUP,
} from '@/modules/kafka/kafka.constants';
import { TestResultMessage } from '@/modules/kafka/types/testRunMessages';
import { TestRunRepository } from '@/modules/test-run/repositories/testRun.repository';
import { TestResultRepository } from '@/modules/test-run/repositories/testResult.repository';

/**
 * aba-bl side of the `test.result` topic: persists the per-definition results
 * the worker's executor produced and finalises the TestRun. Mirrors the
 * vulnerability.fetched consumer's lifecycle and error policy.
 */
@Injectable()
export class TestResultConsumerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(TestResultConsumerService.name);
  private consumer: Consumer | null = null;

  constructor(
    private readonly kafkaClient: KafkaClientService,
    private readonly testRunRepository: TestRunRepository,
    private readonly testResultRepository: TestResultRepository,
  ) {}

  onModuleInit(): void {
    this.consumer = this.kafkaClient.createConsumer(TEST_RESULT_CONSUMER_GROUP);
    this.startConsuming().catch((error) => {
      this.logger.error(
        'Failed to start test.result consumer',
        error?.message,
      );
    });
  }

  private async startConsuming(): Promise<void> {
    await this.consumer!.connect();
    await this.consumer!.subscribe({
      topic: KAFKA_TOPICS.TEST_RESULT,
      fromBeginning: false,
    });
    await this.consumer!.run({
      eachMessage: async ({ message }) =>
        this.handleMessage(message.value?.toString() ?? null),
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.consumer) {
      await this.consumer.disconnect().catch((error) => {
        this.logger.error(
          'Failed to disconnect test.result consumer',
          error?.message,
        );
      });
      this.consumer = null;
    }
  }

  /**
   * Public so tests can drive it with a constructed body. Malformed messages
   * are logged and dropped; a DB failure propagates so kafkajs redelivers.
   */
  async handleMessage(raw: string | null): Promise<void> {
    if (!raw) {
      this.logger.error('Received empty test.result message, skipping');
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      this.logger.error(
        'Received malformed (non-JSON) test.result message, skipping',
        (error as Error)?.message,
      );
      return;
    }

    if (!this.isValidMessage(parsed)) {
      this.logger.error(
        'Received test.result message with unexpected shape, skipping',
      );
      return;
    }

    const run = await this.testRunRepository.findByRunKey(parsed.runKey);
    if (!run) {
      this.logger.error(
        `test.result for unknown runKey ${parsed.runKey}, skipping`,
      );
      return;
    }

    const rows: Prisma.TestResultCreateManyInput[] = parsed.results.map(
      (r) => ({
        testRunId: run.id,
        testDefinitionId: r.definitionId ?? null,
        name: r.name,
        status: this.toStatus(r.status),
        durationMs: r.durationMs ?? null,
        request: (r.request ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        response: (r.response ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        assertionResults: (r.assertionResults ??
          Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
        errorMessage: r.errorMessage ?? null,
      }),
    );

    if (rows.length > 0) {
      await this.testResultRepository.createMany(rows);
    }

    const { passed, failed, error } = parsed.summary;
    const finalStatus =
      failed > 0 || error > 0 ? TestRunStatus.FAILED : TestRunStatus.PASSED;

    await this.testRunRepository.update(run.id, {
      status: finalStatus,
      totalCount: parsed.summary.total,
      passedCount: passed,
      failedCount: failed,
      errorCount: error,
      startedAt: run.startedAt ?? new Date(),
      finishedAt: new Date(),
    });
  }

  private toStatus(status: string): TestResultStatus {
    switch (status) {
      case 'PASSED':
        return TestResultStatus.PASSED;
      case 'FAILED':
        return TestResultStatus.FAILED;
      case 'SKIPPED':
        return TestResultStatus.SKIPPED;
      default:
        return TestResultStatus.ERROR;
    }
  }

  private isValidMessage(value: unknown): value is TestResultMessage {
    if (!value || typeof value !== 'object') return false;
    const msg = value as Record<string, unknown>;
    return (
      typeof msg.runKey === 'string' &&
      typeof msg.serviceId === 'number' &&
      typeof msg.companyId === 'number' &&
      Array.isArray(msg.results) &&
      typeof msg.summary === 'object' &&
      msg.summary !== null
    );
  }
}
