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
    chmodSync,
    chownSync,
} from 'fs';
import { ConfigService } from '@nestjs/config';
import { DirectoryPath } from '@src/utils/directoryPath';
import convert from 'heic-convert';
import { BucketItem } from 'minio';
import { dropRight, join, split } from 'lodash';
import { RabbitMonitorService } from '@src/modules/rmqClient/rmq.monitoring.service';
import { RmqClientService } from '@src/modules/rmqClient/rmq.client.service';

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
                chownSync(convertedFilePath, 1000, 1000);
                chmodSync(convertedFilePath, 0o755);
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

            chownSync(originalFilePath, 1000, 1000);
            chmodSync(originalFilePath, 0o755);
            this.logger.log(`Downloaded: ${originalFilePath}`);
        } catch (error) {
            this.logger.error(`Error downloading from minio:`, error);
            throw error;
        }
    }

    getFoldersPathFromFilePath(s3UrlKey: string): string {
        return join(dropRight(split(s3UrlKey, '/')), '/');
    }

    createFolder(path: string) {
        this.logger.log(`Creating folder [${path}]`);

        try {
            if (!existsSync(path)) {
                mkdirSync(path, { recursive: true });
                chownSync(path, 1000, 1000);
                chmodSync(path, 0o755);
                this.logger.log(`Folder [${path}] successfully created`);
            } else {
                this.logger.log(`Folder [${path}] already exist`);
            }
        } catch (error) {
            this.logger.error(`Can't create folder [${path}]`, error);
            throw error;
        }
    }

    copyFile(fromFilePath: string, toFilePath: string) {
        try {
            copyFileSync(fromFilePath, toFilePath);
            chownSync(toFilePath, 1000, 1000);
            chmodSync(toFilePath, 0o755);
            this.logger.log(
                `copyFile: successfully copied file from ${fromFilePath} to ${toFilePath}`,
            );
        } catch (error) {
            this.logger.error(`copyFile: error`, error);
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
