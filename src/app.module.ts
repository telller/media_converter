import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';
import { HealthModule } from '@src/modules/health/health.module';
import { MediaModule } from '@src/modules/media/media.module';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';

const WORK_DIR = `${__dirname}/..`;
const ENVS_DIR = `${WORK_DIR}/envs`;

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: process.env.NODE_ENV
                ? path.join(ENVS_DIR, `/.env.${process.env.NODE_ENV}`)
                : path.join(ENVS_DIR, '/.env'),
            load: [configuration],
        }),
        ScheduleModule.forRoot(),
        HealthModule,
        MediaModule,
    ],
})
export class AppModule {}
