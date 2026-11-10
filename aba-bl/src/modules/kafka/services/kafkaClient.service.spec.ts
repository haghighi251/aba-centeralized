import { Kafka } from 'kafkajs';
import { KafkaClientService } from '@/modules/kafka/services/kafkaClient.service';

jest.mock('kafkajs');

describe('KafkaClientService', () => {
  let mockProducerInstance: { connect: jest.Mock; disconnect: jest.Mock };
  let mockConsumerInstance: Record<string, unknown>;
  let mockKafkaInstance: { producer: jest.Mock; consumer: jest.Mock };
  let originalBrokers: string | undefined;

  beforeEach(() => {
    originalBrokers = process.env.KAFKA_BROKERS;

    mockProducerInstance = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
    };
    mockConsumerInstance = {};
    mockKafkaInstance = {
      producer: jest.fn().mockReturnValue(mockProducerInstance),
      consumer: jest.fn().mockReturnValue(mockConsumerInstance),
    };
    (Kafka as unknown as jest.Mock).mockImplementation(() => mockKafkaInstance);
  });

  afterEach(() => {
    process.env.KAFKA_BROKERS = originalBrokers;
    jest.clearAllMocks();
  });

  it('builds the client from a comma-separated KAFKA_BROKERS', () => {
    process.env.KAFKA_BROKERS = 'broker1:9092, broker2:9092';

    // eslint-disable-next-line no-new
    new KafkaClientService();

    expect(Kafka).toHaveBeenCalledWith({
      clientId: 'aba-bl',
      brokers: ['broker1:9092', 'broker2:9092'],
    });
  });

  it('defaults to localhost:9092 when KAFKA_BROKERS is unset', () => {
    delete process.env.KAFKA_BROKERS;

    // eslint-disable-next-line no-new
    new KafkaClientService();

    expect(Kafka).toHaveBeenCalledWith({
      clientId: 'aba-bl',
      brokers: ['localhost:9092'],
    });
  });

  it('lazily connects the producer once and memoizes it across calls', async () => {
    const service = new KafkaClientService();

    const first = await service.getProducer();
    const second = await service.getProducer();

    expect(mockKafkaInstance.producer).toHaveBeenCalledTimes(1);
    expect(mockProducerInstance.connect).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
  });

  it('creates a new consumer scoped to the given group id', () => {
    const service = new KafkaClientService();

    const consumer = service.createConsumer('my-group');

    expect(mockKafkaInstance.consumer).toHaveBeenCalledWith({
      groupId: 'my-group',
    });
    expect(consumer).toBe(mockConsumerInstance);
  });

  it('disconnects the producer on module destroy if one was created', async () => {
    const service = new KafkaClientService();
    await service.getProducer();

    await service.onModuleDestroy();

    expect(mockProducerInstance.disconnect).toHaveBeenCalledTimes(1);
  });

  it('is a no-op on module destroy if no producer was ever created', async () => {
    const service = new KafkaClientService();

    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    expect(mockProducerInstance.disconnect).not.toHaveBeenCalled();
  });
});
