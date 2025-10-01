import * as process from 'process';
import { Environment } from '@src/config/constants/env.constant';

export const config = {
    app: {
        env: process.env.NODE_ENV || Environment.DEVELOPMENT,
        port: process.env.PORT || 4000,
    },
};
