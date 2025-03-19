import { Injectable, Inject, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RmqEvent } from './RmqEvent';

@Injectable()
export class RmqClientService implements OnApplicationBootstrap {
    private readonly logger = new Logger(RmqClientService.name);

    constructor(@Inject('MEDIA') private readonly mediaClient: ClientProxy) {}

    async onApplicationBootstrap() {
        await this.mediaClient.connect();
    }

    public createConvertTask(s3key: string) {
        this.emit(RmqEvent.convertImage, { s3key });
    }

    private emit(event: RmqEvent, data: any) {
        this.logger.log(`Emit '${event}' event with data: `, data);
        this.mediaClient.emit(event, JSON.stringify(data));
    }
}
