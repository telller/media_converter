import { Controller, Logger } from '@nestjs/common';
// import { Ctx, Payload, RmqContext } from '@nestjs/microservices';
import { Cron, CronExpression } from '@nestjs/schedule';
// import { RmqEvent } from '../rmqClient/RmqEvent';
import { ConverterService } from './converter.service';

@Controller()
export class ConverterController {
    private readonly logger = new Logger(ConverterController.name);

    constructor(private readonly converterService: ConverterService) {}

    // @EventPattern(RmqEvent.convertImage)
    // async convertImage(@Payload() data: any, @Ctx() context: RmqContext) {
    //     this.logger.log(`Handle ${RmqEvent.convertImage} event with data:`, data);
    //
    //     const isSuccess = await this.converterService.convert(
    //         data.originalMediaId,
    //         data.userId,
    //         data.s3url,
    //         data.s3key,
    //     );
    //
    //     if (isSuccess) {
    //         this.logger.log('Event successfully processed');
    //     } else {
    //         this.logger.warn('Unable to process event');
    //     }
    //
    //     context.getChannelRef().ack(context.getMessage());
    // }

    @Cron(CronExpression.EVERY_10_SECONDS)
    async pullImagesToConvert() {
        await this.converterService.convertImages();
    }
}
