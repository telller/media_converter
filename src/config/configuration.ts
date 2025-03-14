import { Config } from './interfaces/config.interface';

export default async (): Promise<Config> => {
    const { config } = <{ config: Config }>await import(`${__dirname}/default`);
    return config;
};
