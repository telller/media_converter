import { Injectable, Logger } from '@nestjs/common';
import { readFileSync, writeFileSync, chmodSync, chownSync, unlinkSync } from 'fs';
import convert from 'heic-convert';
import readdirp from 'readdirp';
import { DirectoryPath } from '@src/utils/directoryPath';

@Injectable()
export class ConverterService {
    constructor(private readonly logger: Logger) {}

    async convertHeicToJpg() {
        const stream = readdirp(DirectoryPath.original, {
            fileFilter: ({ fullPath }) => fullPath.includes('.heic') || fullPath.includes('.HEIC'),
            alwaysStat: true,
        });

        console.log(`Start converting... `);

        // eslint-disable-next-line no-restricted-syntax
        for await (const entry of stream) {
            console.log('entry', entry);
            const inputPath = entry.fullPath;
            const outputPath = inputPath.replace(/\.heic$/i, '.jpg');

            try {
                const inputBuffer = readFileSync(inputPath);
                const outputBuffer = await convert({
                    buffer: inputBuffer,
                    format: 'JPEG',
                    quality: 1,
                });
                writeFileSync(outputPath, Buffer.from(outputBuffer));
                this.setPermissions(outputPath);

                unlinkSync(inputPath);
                console.log(`✅ ${inputPath} → ${outputPath}`);
            } catch (err) {
                console.error(`❌ Помилка при конвертації ${inputPath}:`, err);
            }
        }
    }

    setPermissions(path: string) {
        try {
            chownSync(path, 1000, 1000);
            chmodSync(path, 0o644);
            this.logger.log(`setPermissions: successfully set permissions for ${path}`);
        } catch (error) {
            this.logger.error(`setPermissions: error`, error);
            throw error;
        }
    }
}
