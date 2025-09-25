import { Controller, Logger, Post } from '@nestjs/common';
import { RmqContext, Ctx, EventPattern, Payload } from '@nestjs/microservices';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RmqEvent } from '@src/modules/rmqClient/RmqEvent';
import { ConverterService } from './converter.service';

@Controller()
export class ConverterController {
    private readonly logger = new Logger(ConverterController.name);

    constructor(private readonly converterService: ConverterService) {}

    @EventPattern(RmqEvent.convertImage)
    async convertImage(@Payload() data: any, @Ctx() context: RmqContext) {
        this.logger.log(`Handle ${RmqEvent.convertImage} event with data:`, data);

        const dataObj = JSON.parse(data);
        const isSuccess = await this.converterService.processFile(dataObj.s3key);

        if (isSuccess) {
            this.logger.log('Event successfully processed');
        } else {
            this.logger.warn('Unable to process event');
        }

        context.getChannelRef().ack(context.getMessage());
    }

    @Cron(CronExpression.EVERY_10_MINUTES)
    async pullImagesToConvert() {
        await this.converterService.getFilesListFromMinio();
    }

    @Post('/start-convert')
    async getCoursesList() {
        await this.converterService.getFilesListFromMinio();
        return { success: true };
    }
}
