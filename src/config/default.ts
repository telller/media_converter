import * as process from 'process';
import { Environment } from '@src/config/constants/env.constant';

export const config = {
    app: {
        env: process.env.NODE_ENV || Environment.DEVELOPMENT,
        port: process.env.PORT || 4000,
    },
    rmq: {
        host: process.env.RMQ_HOST,
        port: process.env.RMQ_PORT,
        user: process.env.RMQ_USER,
        password: process.env.RMQ_PASSWORD,
        converterQueue: process.env.RMQ_CONVERTER_QUEUE,
    },
    minio: {
        host: process.env.MINIO_HOST,
        port: Number(process.env.MINIO_PORT),
        bucket: process.env.MINIO_BUCKET,
        accessKey: process.env.MINIO_ACCESS_KEY,
        secretKey: process.env.MINIO_SECRET_KEY,
    },
};
