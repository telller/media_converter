import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConverterService } from '@src/services/converter.service';
import { RenameService } from '@src/services/rename.service';
import { MediaController } from './media.controller';

@Module({
    imports: [ConfigModule],
    controllers: [MediaController],
    providers: [ConverterService, RenameService, Logger],
})
export class MediaModule {}
