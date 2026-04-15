import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import readdirp from 'readdirp';
import fs from 'fs/promises';
import path from 'path';
import { DirectoryPath } from '@src/utils/directoryPath';

const execFileAsync = promisify(execFile);

const TIMESTAMP_REGEX = /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_/;
const NO_TS_PREFIX = 'NO_TIMESTAMP';

@Injectable()
export class RenameService {
    private renaming = false;

    constructor(private readonly logger: Logger) {}

    async renameFiles() {
        if (this.renaming) {
            this.logger.warn('renameFiles: already running');
            return;
        }

        this.renaming = true;
        this.logger.log('renameFiles: started');

        const stream = readdirp(DirectoryPath.original, {
            fileFilter: ({ basename, fullPath }) => {
                if (basename.toLowerCase().endsWith('.aac')) return false;
                if (fullPath.includes('VAZ_2105_DASH_CAM')) return false;
                if (basename.startsWith(NO_TS_PREFIX)) return false;
                if (basename.startsWith('.')) return false;
                return !TIMESTAMP_REGEX.test(basename);
            },
            depth: Infinity,
        });

        try {
            // eslint-disable-next-line no-restricted-syntax
            for await (const entry of stream) {
                const inputPath = entry.fullPath;
                const dir = path.dirname(inputPath);
                const baseName = path.basename(inputPath);

                this.logger.log(`renameFile: in progress: ${inputPath}`);
                try {
                    const timestamp =
                        (await this.getCaptureTimestamp(inputPath)) ||
                        (await this.getFileSystemTimestamp(inputPath));
                    if (timestamp) {
                        const ext = path.extname(baseName);
                        const nameWithoutExt = path.basename(baseName, ext);
                        const newName = `${timestamp}_${nameWithoutExt}${ext}`;
                        const outputPath = path.join(dir, newName);
                        await fs.rename(inputPath, outputPath);
                        await this.setPermissions(outputPath);
                        this.logger.log(
                            `renameFile: successfully renamed ${baseName} → ${newName}`,
                        );
                    } else {
                        const noTimestampPath = `${NO_TS_PREFIX}_${baseName}`;
                        const outputPath = path.join(dir, noTimestampPath);

                        await fs.rename(inputPath, outputPath);
                        await this.setPermissions(outputPath);

                        this.logger.warn(
                            `renameFile: no timestamp → ${baseName} → ${noTimestampPath}`,
                        );
                    }
                } catch (err) {
                    this.logger.error(`renameFile: error: ${inputPath}`, err);
                }
            }

            this.logger.log('renameFiles: finished');
        } finally {
            this.renaming = false;
        }
    }

    async setPermissions(outputPath: string) {
        try {
            await fs.chown(outputPath, 1000, 1000);
            await fs.chmod(outputPath, 0o744);
            this.logger.log(`setPermissions: successfully set permissions for ${outputPath}`);
        } catch (error) {
            this.logger.error(`setPermissions: error`, error);
            throw error;
        }
    }

    private async getCaptureTimestamp(filePath: string): Promise<string | null> {
        const { stdout } = await execFileAsync('/usr/bin/exiftool', [
            '-DateTimeOriginal',
            '-MediaCreateDate',
            '-CreateDate',
            '-TrackCreateDate',
            '-s3',
            filePath,
        ]);
        const lines = stdout.toString().trim().split('\n').filter(Boolean);
        if (!lines.length) return null;
        const raw = lines[0];
        if (!raw) return null;
        const match = raw.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
        if (!match) return null;
        const [, y, m, d, hh, mm, ss] = match;
        return `${y}-${m}-${d}_${hh}-${mm}-${ss}`;
    }

    private async getFileSystemTimestamp(filePath: string): Promise<string | null> {
        try {
            const stat = await fs.stat(filePath);
            const date =
                stat.birthtime && stat.birthtime.getTime() > 0 ? stat.birthtime : stat.mtime;
            const pad = (n: number) => String(n).padStart(2, '0');
            return (
                `${date.getFullYear()}-` +
                `${pad(date.getMonth() + 1)}-` +
                `${pad(date.getDate())}_` +
                `${pad(date.getHours())}-` +
                `${pad(date.getMinutes())}-` +
                `${pad(date.getSeconds())}`
            );
        } catch {
            return null;
        }
    }
}
