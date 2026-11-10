import { Global, Module } from '@nestjs/common';
import { KafkaClientService } from '@/modules/kafka/services/kafkaClient.service';

/**
 * Global so any feature module can inject KafkaClientService without every
 * caller having to re-import this module explicitly.
 */
@Global()
@Module({
  providers: [KafkaClientService],
  exports: [KafkaClientService],
})
export class KafkaModule {}
