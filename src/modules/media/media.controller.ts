import { Cron, CronExpression } from '@nestjs/schedule';
import { Controller, Post } from '@nestjs/common';
import { ConverterService } from '@src/services/converter.service';
import { RenameService } from '@src/services/rename.service';

@Controller()
export class MediaController {
    constructor(
        private readonly converterService: ConverterService,
        private readonly renameService: RenameService,
    ) {}

    @Cron(CronExpression.EVERY_DAY_AT_NOON)
    async convertHeicToJpgCron() {
        await this.converterService.convertHeicToJpg();
        await this.renameService.renameFiles();
    }

    @Post('/start-convert')
    async convertHeicToJpg() {
        const start = Date.now();
        await this.converterService.convertHeicToJpg();
        return {
            took: (Date.now() - start) / 1000,
            success: true,
        };
    }

    @Post('/start-rename')
    async renameFiles() {
        const start = Date.now();
        await this.renameService.renameFiles();
        return {
            took: (Date.now() - start) / 1000,
            success: true,
        };
    }
}
