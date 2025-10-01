import { Controller, Logger, Post } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConverterService } from './converter.service';

@Controller()
export class ConverterController {
    private readonly logger = new Logger(ConverterController.name);

    constructor(private readonly converterService: ConverterService) {}

    @Cron(CronExpression.EVERY_HOUR)
    async pullImagesToConvert() {
        await this.converterService.convertHeicToJpg();
    }

    @Post('/start-convert')
    async getFilesListFromMinio() {
        await this.converterService.convertHeicToJpg();
        return { success: true };
    }
}
