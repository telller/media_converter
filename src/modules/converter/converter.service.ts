import { DirectoryPath } from '@src/utils/directoryPath';
import { Injectable, Logger } from '@nestjs/common';
import convert from 'heic-convert';
import readdirp from 'readdirp';
import fs from 'fs/promises';

@Injectable()
export class ConverterService {
    private converting = false;

    constructor(private readonly logger: Logger) {}

    async convertHeicToJpg() {
        if (this.converting) {
            this.logger.warn('convertHeicToJpg: already running');
            return;
        }

        this.logger.log(`convertHeicToJpg: started`);
        this.converting = true;

        const stream = readdirp(DirectoryPath.original, {
            fileFilter: ({ fullPath }) => fullPath.includes('.heic') || fullPath.includes('.HEIC'),
            depth: Infinity,
        });

        // eslint-disable-next-line no-restricted-syntax
        for await (const entry of stream) {
            this.logger.log(`convertHeicToJpg: in progress`);
            const inputPath = entry.fullPath;
            const outputPath = inputPath.replace(/\.heic$/i, '.jpg');

            try {
                const inputBuffer = await fs.readFile(inputPath);
                const outputBuffer = await convert({
                    buffer: inputBuffer,
                    format: 'JPEG',
                    quality: 1,
                });
                await fs.writeFile(outputPath, Buffer.from(outputBuffer));
                await this.setPermissions(outputPath);

                await fs.unlink(inputPath);
                this.logger.log(
                    `convertHeicToJpg: successfully converted ${inputPath} → ${outputPath}`,
                );
            } catch (err) {
                this.logger.error(`convertHeicToJpg: error during conversation ${inputPath}`, err);
            }
        }
        this.logger.log(`convertHeicToJpg: finished`);
        this.converting = false;
    }

    async setPermissions(path: string) {
        try {
            await fs.chown(path, 1000, 1000);
            await fs.chmod(path, 0o744);
            this.logger.log(`setPermissions: successfully set permissions for ${path}`);
        } catch (error) {
            this.logger.error(`setPermissions: error`, error);
            throw error;
        }
    }
}
