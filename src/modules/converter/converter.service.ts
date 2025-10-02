import { DirectoryPath } from '@src/utils/directoryPath';
import { Injectable, Logger } from '@nestjs/common';
import { execFile, exec } from 'child_process';
import { promisify } from 'util';
import readdirp from 'readdirp';
import fs from 'fs/promises';

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

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
                await execFileAsync('heif-convert', [inputPath, outputPath]);
                await this.setPermissions(outputPath);
                await this.cleanup(inputPath);

                this.logger.log(
                    `convertHeicToJpg: successfully converted ${inputPath} → ${outputPath}`,
                );
            } catch (err) {
                this.logger.error(`convertHeicToJpg: error during conversation ${inputPath}`, err);
            }
        }
        await this.removeAppleDoubleFiles(DirectoryPath.original);
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

    async cleanup(path: string) {
        try {
            await fs.unlink(path);
            await fs
                .unlink(path.replace(/\.heic$/i, '.mov'))
                .catch((e) => e.code !== 'ENOENT' && Promise.reject(e));
            await fs
                .unlink(path.replace(/\.heic$/i, '.MOV'))
                .catch((e) => e.code !== 'ENOENT' && Promise.reject(e));
            this.logger.log(`cleanup: successfully deleted ${path} and .mov/.MOV`);
        } catch (error) {
            this.logger.error(`cleanup: error`, error);
            throw error;
        }
    }

    async removeAppleDoubleFiles(path: string) {
        try {
            await execAsync(`find ${path} -type f -name '._*' -exec rm -f {} +`);
            this.logger.log(`removeAppleDoubleFiles: successfully deleted all "._*" files`);
        } catch (error) {
            this.logger.log(`removeAppleDoubleFiles: error`, error);
        }
    }
}
