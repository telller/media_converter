import * as Minio from 'minio';
import { Injectable, Logger } from '@nestjs/common';
import { Readable } from 'stream';
import {
    createReadStream,
    createWriteStream,
    existsSync,
    mkdirSync,
    rm,
    readFile,
    writeFile,
} from 'fs';
import { ConfigService } from '@nestjs/config';
import { DirectoryPath } from '@src/utils/directoryPath';
import convert from 'heic-convert';
import { promisify } from 'util';
import { BucketItem } from 'minio';
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

    // async convert(
    //     originalMediaId: string,
    //     userId: string,
    //     s3Url: string,
    //     s3key: string,
    // ): Promise<boolean> {
    //     const fileName = s3key.substring(s3key.lastIndexOf('/') + 1);
    //     const rawFilePath = `${DirectoryPath.raw}/${fileName}`;
    //
    //     const compressedFileName = `compressed_${fileName}`;
    //     const compressedRawFilePath = `${DirectoryPath.raw}/${compressedFileName}`;
    //
    //     try {
    //         await this.downloadFromS3(s3key, rawFilePath);
    //
    //         // generate stream
    //         await this.performConverting(rawFilePath);
    //
    //         // compress original file
    //         await this.uploadRawToS3(compressedFileName);
    //
    //         // update original file db record
    //         this.updateRAWMediaFile(
    //             originalMediaId,
    //             compressedFileName,
    //             `${DirectoryPath.raw_s3}/${compressedFileName}`,
    //         );
    //
    //         return true;
    //     } catch (error) {
    //         return false;
    //     } finally {
    //         this.cleanup(rawFilePath);
    //         this.cleanup(compressedRawFilePath);
    //     }
    // }

    // async performConverting(rawFilePath: string): Promise<void> {
    //     this.createTmpFolder(DirectoryPath.stream);
    //
    //     this.logger.log(`Start perform converting for ${rawFilePath} ...`);
    //
    //     try {
    //         console.log('asdasd');
    //     } catch (error) {
    //         this.logger.error(`Converting error for ${rawFilePath} :::`, error);
    //         throw error;
    //     }
    // }

    async downloadFromS3(key: string, rawFilePath: string) {
        this.createTmpFolder(DirectoryPath.raw);

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

    async uploadRawToS3(fileName: string) {
        this.logger.log(`uploadRawToS3: Uploading to minio ...`);

        try {
            const rawFilePath = `${DirectoryPath.png}/${fileName}`;
            const key = `minio/${fileName}`;

            await this.minioClient
                .putObject(this.minioConfig.bucket, key, createReadStream(rawFilePath))
                .then(async () => {
                    this.logger.log(`Uploaded: ${key}`);
                });

            this.logger.log(`Raw file successfully uploaded to minio`);
        } catch (error) {
            this.logger.error(`Error uploading raw to minio:`, error);
            throw error;
        }
    }

    async deleteRawS3Image(s3Key: string) {
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

    private cleanup(path: string) {
        rm(path, { recursive: true }, (error) => {
            if (error) {
                this.logger.error(`Error deleting: ${path}`);
            } else {
                this.logger.log(`Deleted: ${path}`);
            }
        });
    }

    createTmpFolder(path: string) {
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

    async getImagesListFromMinio() {
        this.logger.log(`Get images list from minio`);

        const stream = this.minioClient.listObjectsV2(this.minioConfig.bucket, undefined, true);
        stream.on('data', (obj: BucketItem) => {
            if (obj && obj.name && obj.name.toLowerCase().includes('.heic')) {
                this.rmqService.createConvertTask(obj.name);
            }
        });
        stream.on('end', () => {
            console.log('finished');
        });
        stream.on('error', (error) => {
            this.logger.error(`Error downloading images list from minio:`, error);
        });
    }

    async convertImage(s3Key: string) {
        try {
            this.createTmpFolder(DirectoryPath.raw);
            this.createTmpFolder(DirectoryPath.png);

            const originalFileName = s3Key.substring(s3Key.lastIndexOf('/') + 1);
            const newFileName = originalFileName.replace('.HEIC', '.png');
            const rawFilePath = `${DirectoryPath.raw}/${originalFileName}`;
            await this.downloadFromS3(s3Key, rawFilePath);

            const inputBuffer = await promisify(readFile)(rawFilePath);
            // eslint-disable-next-line no-await-in-loop
            const outputBuffer = await convert({
                buffer: inputBuffer, // the HEIC file buffer
                format: 'PNG', // output format
            });
            await promisify(writeFile)(
                `${DirectoryPath.png}/${newFileName}`,
                // @ts-ignore
                outputBuffer,
            );

            await this.uploadRawToS3(newFileName);
            await this.deleteRawS3Image(s3Key);

            this.cleanup(DirectoryPath.raw);
            this.cleanup(DirectoryPath.png);

            await new Promise<void>((resolve) => {
                setTimeout(() => resolve(), 1000);
            });

            return true;
        } catch (error) {
            this.logger.error(`Error occurred during image conversion: s3Key=${s3Key}:`, error);
            return false;
        }
    }
}
