import { Logger, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RmqClientService } from './rmq.client.service';

@Module({
    imports: [
        ConfigModule,
        ClientsModule.registerAsync([
            {
                name: 'MEDIA',
                imports: [ConfigModule],
                useFactory: async (configService: ConfigService) => {
                    const rmq = configService.getOrThrow('rmq');
                    return {
                        transport: Transport.RMQ,
                        options: {
                            urls: [`amqp://${rmq.user}:${rmq.password}@${rmq.host}:${rmq.port}`],
                            queue: rmq.mediaQueue,
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
    controllers: [],
    providers: [RmqClientService, Logger],
    exports: [RmqClientService],
})
export class RmqClientModule {}
