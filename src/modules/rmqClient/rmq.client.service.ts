import { Injectable, Inject, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Channel } from 'amqplib';
import { ConfigService } from '@nestjs/config';
import { RmqConfig } from '@src/config/interfaces/config.interface';
import { RmqEvent } from './RmqEvent';

@Injectable()
export class RmqClientService implements OnApplicationBootstrap {
    private readonly logger = new Logger(RmqClientService.name);

    private readonly channel: Channel;

    private readonly queueName: string;

    constructor(
        @Inject('MEDIA') private readonly mediaClient: ClientProxy,
        private readonly configService: ConfigService,
    ) {
        const rmq: RmqConfig = this.configService.getOrThrow('rmq');
        this.queueName = rmq.converterQueue || '';
        // @ts-expect-error
        this.channel = this.mediaClient.channel as Channel;
    }

    async onApplicationBootstrap() {
        await this.mediaClient.connect();
    }

    public createConvertTask(s3key: string) {
        this.emit(RmqEvent.convertImage, { s3key });
    }

    public async isQueueEmpty() {
        if (!this.channel) return false;
        const q = await this.channel.checkQueue(this.queueName);
        return q.messageCount === 0;
    }

    private emit(event: RmqEvent, data: any) {
        this.logger.log(`Emit '${event}' event with data: `, data);
        this.mediaClient.emit(event, JSON.stringify(data));
    }
}
