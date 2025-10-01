import * as Minio from 'minio';
import { Injectable, Logger } from '@nestjs/common';
import { Readable } from 'stream';
import {
    createWriteStream,
    existsSync,
    mkdirSync,
    readFileSync,
    writeFileSync,
    copyFileSync,
    statSync,
    chmodSync,
    chownSync,
} from 'fs';
import { ConfigService } from '@nestjs/config';
import { DirectoryPath } from '@src/utils/directoryPath';
import convert from 'heic-convert';
import { BucketItem } from 'minio';
import { dropRight, join, reduce, split } from 'lodash';
import { RabbitMonitorService } from '@src/modules/rmqClient/rmq.monitoring.service';
import { RmqClientService } from '@src/modules/rmqClient/rmq.client.service';
import path from 'path';

@Injectable()
export class ConverterService {
    private readonly logger = new Logger(ConverterService.name);

    private readonly minioClient: Minio.Client;

    private minioConfig = this.configService.getOrThrow('minio');

    constructor(
        private readonly rabbitMonitorService: RabbitMonitorService,
        private readonly rmqService: RmqClientService,
        private readonly configService: ConfigService,
    ) {
        this.minioClient = new Minio.Client({
            endPoint: this.minioConfig.host,
            port: this.minioConfig.port,
            accessKey: this.minioConfig.accessKey,
            secretKey: this.minioConfig.secretKey,
            useSSL: false,
        });
    }

    async getFilesListFromMinio() {
        if (!(await this.rabbitMonitorService.isQueueEmpty())) {
            this.logger.log(`getImagesListFromMinio: queue in not empty; skipping`);
            return;
        }
        this.logger.log(`getImagesListFromMinio: started`);

        const stream = this.minioClient.listObjectsV2(this.minioConfig.bucket, undefined, true);
        stream.on('data', (obj: BucketItem) => {
            if (obj && obj.name) {
                this.logger.log('getImagesListFromMinio: in progress');
                this.rmqService.createConvertTask(obj.name);
            }
            this.logger.log('getImagesListFromMinio: unknown file; skipping');
        });
        stream.on('end', () => {
            this.logger.log('getImagesListFromMinio: finished');
        });
        stream.on('error', (error) => {
            this.logger.error(`getImagesListFromMinio: error:`, error);
        });
    }

    async processFile(s3Key: string) {
        try {
            const originalFilePath = `${DirectoryPath.original}/${s3Key}`;
            await this.downloadFromS3(s3Key, originalFilePath);

            if (originalFilePath.toLowerCase().includes('.heic')) {
                const newFileName = s3Key.replace('.HEIC', '.jpg');
                const convertedFilePath = `${DirectoryPath.converted}/${newFileName}`;
                this.createFolder(this.getFoldersPathFromFilePath(convertedFilePath));
                const inputBuffer = readFileSync(originalFilePath);
                const outputBuffer = await convert({
                    buffer: inputBuffer,
                    format: 'JPEG',
                    quality: 1,
                });
                writeFileSync(convertedFilePath, Buffer.from(outputBuffer));
                this.setPermissions(convertedFilePath);
            } else {
                const convertedFilePath = `${DirectoryPath.converted}/${s3Key}`;
                this.createFolder(this.getFoldersPathFromFilePath(convertedFilePath));
                this.copyFile(originalFilePath, convertedFilePath);
            }

            await this.deleteFileFromS3(s3Key);

            return true;
        } catch (error) {
            this.logger.error(`Error occurred during image conversion: s3Key=${s3Key}:`, error);
            return false;
        }
    }

    async downloadFromS3(key: string, originalFilePath: string) {
        this.createFolder(this.getFoldersPathFromFilePath(originalFilePath));

        this.logger.log(`Downloading from minio: ${key}`);

        try {
            const s3item = await this.minioClient.getObject(this.minioConfig.bucket, key);
            const pipe = (s3item as Readable).pipe(createWriteStream(originalFilePath));
            await new Promise<void>((resolve, reject) => {
                pipe.on('finish', resolve);
                pipe.on('error', reject);
            });

            this.setPermissions(originalFilePath);
            this.logger.log(`Downloaded: ${originalFilePath}`);
        } catch (error) {
            this.logger.error(`Error downloading from minio:`, error);
            throw error;
        }
    }

    getFoldersPathFromFilePath(s3UrlKey: string): string {
        return join(dropRight(split(s3UrlKey, '/')), '/');
    }

    createFolder(folderPath: string) {
        this.logger.log(`Creating folder [${folderPath}]`);

        try {
            if (!existsSync(folderPath)) {
                mkdirSync(folderPath, { recursive: true });
                this.setPermissions(folderPath);
                this.logger.log(`Folder [${folderPath}] successfully created`);
            } else {
                this.logger.log(`Folder [${folderPath}] already exist`);
            }
        } catch (error) {
            this.logger.error(`Can't create folder [${folderPath}]`, error);
            throw error;
        }
    }

    copyFile(fromFilePath: string, toFilePath: string) {
        try {
            copyFileSync(fromFilePath, toFilePath);
            this.setPermissions(toFilePath);
            this.logger.log(
                `copyFile: successfully copied file from ${fromFilePath} to ${toFilePath}`,
            );
        } catch (error) {
            this.logger.error(`copyFile: error`, error);
            throw error;
        }
    }

    setPermissions(fullPath: string) {
        const uid = 1000;
        const gid = 1000;
        const dirMode = 0o755;
        const fileMode = 0o644;
        try {
            const rawSegments = fullPath.split('/').filter(Boolean);
            const segments = fullPath.startsWith('/') ? ['/', ...rawSegments] : rawSegments;
            reduce(
                segments,
                (accPath, segment, index) => {
                    const currentPath = index === 0 ? segment : path.join(accPath, segment);
                    const mode = statSync(currentPath).isDirectory() ? dirMode : fileMode;
                    chownSync(currentPath, uid, gid);
                    chmodSync(currentPath, mode);
                    return currentPath;
                },
                '',
            );
            this.logger.log(`setPermissions: successfully set permissions for ${fullPath}`);
        } catch (error) {
            this.logger.error(`setPermissions: error`, error);
            throw error;
        }
    }

    async deleteFileFromS3(s3Key: string) {
        this.logger.log(`deleteRawS3Image: deleting raw image ...`);

        try {
            await this.minioClient.removeObject(this.minioConfig.bucket, s3Key).then(async () => {
                this.logger.log(`Removed: ${s3Key}`);
            });

            this.logger.log(`Raw file successfully deleted from minio`);
        } catch (error) {
            this.logger.error(`Error deleting raw from minio:`, error);
            throw error;
        }
    }
}
