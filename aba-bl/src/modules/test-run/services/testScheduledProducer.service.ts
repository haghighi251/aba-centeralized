import { Injectable, Logger } from '@nestjs/common';
import { KafkaClientService } from '@/modules/kafka/services/kafkaClient.service';
import { KAFKA_TOPICS } from '@/modules/kafka/kafka.constants';
import { TestScheduledMessage } from '@/modules/kafka/types/testRunMessages';

/**
 * Publishes `test.scheduled` for worker's Test Executor. Mirrors
 * PackageRescanSchedulerService.publishScanForService: never throws — a Kafka
 * failure is logged and swallowed so the HTTP request that triggered the run
 * still returns (the run simply stays QUEUED until retried).
 */
@Injectable()
export class TestScheduledProducerService {
  private readonly logger = new Logger(TestScheduledProducerService.name);

  constructor(private readonly kafkaClient: KafkaClientService) {}

  async publish(message: TestScheduledMessage): Promise<void> {
    const producer = await this.kafkaClient.getProducer();
    await producer
      .send({
        topic: KAFKA_TOPICS.TEST_SCHEDULED,
        messages: [
          { key: message.runKey, value: JSON.stringify(message) },
        ],
      })
      .catch((error) => {
        this.logger.error(
          `Failed to publish test.scheduled for run ${message.runKey}`,
          error?.message,
        );
      });
  }
}
