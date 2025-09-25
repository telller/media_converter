import { Logger, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RmqConfig } from '@src/config/interfaces/config.interface';
import { RabbitMonitorService } from '@src/modules/rmqClient/rmq.monitoring.service';
import { RmqClientService } from '@src/modules/rmqClient/rmq.client.service';

@Module({
    imports: [
        ConfigModule,
        ClientsModule.registerAsync([
            {
                name: 'MEDIA',
                imports: [ConfigModule],
                useFactory: async (configService: ConfigService) => {
                    const rmq: RmqConfig = configService.getOrThrow('rmq');
                    return {
                        transport: Transport.RMQ,
                        options: {
                            urls: [`amqp://${rmq.user}:${rmq.password}@${rmq.host}:${rmq.port}`],
                            queue: rmq.converterQueue,
                            queueOptions: {
                                durable: true,
                            },
                            noAck: true,
                        },
                    };
                },
                inject: [ConfigService],
            },
        ]),
    ],
    providers: [RabbitMonitorService, RmqClientService, Logger],
    exports: [RabbitMonitorService, RmqClientService],
})
export class RmqClientModule {}
