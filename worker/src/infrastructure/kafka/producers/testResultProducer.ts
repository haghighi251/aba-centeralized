import { getKafkaProducer, KAFKA_TOPICS } from '@/infrastructure/kafka/kafkaClient';
import { TestResultMessage } from '@/infrastructure/kafka/types/testRunMessages';

/** Publishes a completed test run's per-definition results back to aba-bl. */
export async function publishTestResult(
  message: TestResultMessage,
): Promise<void> {
  const producer = await getKafkaProducer();

  await producer.send({
    topic: KAFKA_TOPICS.TEST_RESULT,
    messages: [{ key: message.runKey, value: JSON.stringify(message) }],
  });
}
