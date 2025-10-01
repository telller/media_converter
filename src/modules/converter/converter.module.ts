import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConverterController } from './converter.controller';
import { ConverterService } from './converter.service';

@Module({
    imports: [ConfigModule],
    controllers: [ConverterController],
    providers: [ConverterService, Logger],
})
export class ConverterModule {}
