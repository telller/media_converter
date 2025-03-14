import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RmqClientModule } from '../rmqClient/rmq.client.module';
import { ConverterController } from './converter.controller';
import { ConverterService } from './converter.service';

@Module({
    imports: [ConfigModule, RmqClientModule],
    controllers: [ConverterController],
    providers: [ConverterService, Logger],
})
export class ConverterModule {}
