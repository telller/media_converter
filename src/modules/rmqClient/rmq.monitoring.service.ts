import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { ChannelModel } from 'amqplib'; // імпорт через namespace

@Injectable()
export class RabbitMonitorService implements OnModuleInit {
    private channel: amqp.Channel;

    private readonly logger = new Logger(RabbitMonitorService.name);

    constructor(private readonly configService: ConfigService) {}

    async onModuleInit() {
        const rmq = this.configService.getOrThrow('rmq');

        const connection: ChannelModel = await amqp.connect(
            `amqp://${rmq.user}:${rmq.password}@${rmq.host}:${rmq.port}`,
        );
        this.channel = await connection.createChannel();

        this.logger.log(`RabbitMQ monitor initialized for queue: ${rmq.converterQueue}`);
    }

    public async isQueueEmpty(): Promise<boolean> {
        if (!this.channel) return false;
        const queueName = this.configService.getOrThrow('rmq.converterQueue');
        const q = await this.channel.checkQueue(queueName);
        this.logger.log(`Queue '${queueName}' messages: ${q.messageCount}`);
        return q.messageCount === 0;
    }
}
