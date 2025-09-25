import * as Minio from 'minio';
import { Injectable, Logger } from '@nestjs/common';
import { Readable } from 'stream';
import { createWriteStream, existsSync, mkdirSync, readFile, writeFile, copyFileSync } from 'fs';
import { ConfigService } from '@nestjs/config';
import { DirectoryPath } from '@src/utils/directoryPath';
import convert from 'heic-convert';
import { promisify } from 'util';
import { BucketItem } from 'minio';
import { dropRight, join, last, split } from 'lodash';
import { RmqClientService } from '../rmqClient/rmq.client.service';

@Injectable()
export class ConverterService {
    private readonly logger = new Logger(ConverterService.name);

    private readonly minioClient: Minio.Client;

    private minioConfig = this.configService.getOrThrow('minio');

    constructor(
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
            const originalFileName = last(split(s3Key, '/')) || '';
            const originalFilePath = `${DirectoryPath.original}/${originalFileName}`;
            await this.downloadFromS3(s3Key, originalFilePath);

            if (originalFilePath.toLowerCase().includes('.heic')) {
                const newFileName = originalFileName.replace('.HEIC', '.jpg');
                const convertedFilePath = `${DirectoryPath.converted}/${newFileName}`;
                const inputBuffer = await promisify(readFile)(originalFilePath);
                const outputBuffer = await convert({
                    buffer: inputBuffer,
                    format: 'JPEG',
                    quality: 1,
                });
                await promisify(writeFile)(
                    convertedFilePath,
                    // @ts-ignore
                    outputBuffer,
                );
            } else {
                const convertedFilePath = `${DirectoryPath.converted}/${originalFileName}`;
                this.copyFile(originalFilePath, convertedFilePath);
            }

            await this.deleteFileFromS3(s3Key);

            // TODO: remove this
            await new Promise<void>((resolve) => {
                setTimeout(() => resolve(), 1000);
            });

            return true;
        } catch (error) {
            this.logger.error(`Error occurred during image conversion: s3Key=${s3Key}:`, error);
            return false;
        }
    }

    async downloadFromS3(key: string, rawFilePath: string) {
        this.createFolder(this.getFoldersPathFromFilePath(rawFilePath));

        this.logger.log(`Downloading from minio: ${key}`);

        try {
            const s3item = await this.minioClient.getObject(this.minioConfig.bucket, key);
            const pipe = (s3item as Readable).pipe(createWriteStream(rawFilePath));
            await new Promise<void>((resolve, reject) => {
                pipe.on('finish', resolve);
                pipe.on('error', reject);
            });

            this.logger.log(`Downloaded: ${rawFilePath}`);
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
