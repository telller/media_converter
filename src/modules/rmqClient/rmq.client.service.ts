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

    public updateRAWMediaFile(
        originalMediaId: string,
        fileName: string,
        fileSize: number,
        s3url: string,
        s3key: string,
    ) {
        this.emit(RmqEvent.updateOriginalMedia, {
            originalMediaId,
            fileName,
            fileSize,
            s3url,
            s3key,
        });
    }

    private emit(event: RmqEvent, data: any) {
        this.logger.log(`Emit '${event}' event with data: `, data);
        this.mediaClient.emit(event, JSON.stringify(data));
    }
}
