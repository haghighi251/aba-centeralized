import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Consumer, Kafka, Producer } from 'kafkajs';

/**
 * Thin wrapper around a single kafkajs client shared by every producer and
 * consumer in this service. Kept deliberately small (no @nestjs/microservices
 * Kafka transport) since this is plain pub/sub messaging, not RPC.
 */
@Injectable()
export class KafkaClientService implements OnModuleDestroy {
  private readonly logger = new Logger(KafkaClientService.name);
  private readonly kafka: Kafka;
  private producer: Producer | null = null;

  constructor() {
    const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092')
      .split(',')
      .map((broker) => broker.trim());

    this.kafka = new Kafka({ clientId: 'aba-bl', brokers });
  }

  /** Lazily connects and memoizes a single shared producer instance. */
  async getProducer(): Promise<Producer> {
    if (!this.producer) {
      const producer = this.kafka.producer();
      await producer.connect();
      this.producer = producer;
    }
    return this.producer;
  }

  /** Creates a new consumer for the given group id. Caller owns connect/subscribe/run/disconnect. */
  createConsumer(groupId: string): Consumer {
    return this.kafka.consumer({ groupId });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.producer) {
      await this.producer.disconnect().catch((error) => {
        this.logger.error(
          'Failed to disconnect Kafka producer',
          error?.message,
        );
      });
      this.producer = null;
    }
  }
}
