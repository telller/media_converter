import * as Minio from 'minio';
import { Injectable, Logger } from '@nestjs/common';
import { Readable } from 'stream';
import {
    createReadStream,
    createWriteStream,
    existsSync,
    mkdirSync,
    readdirSync,
    statSync,
    rm,
    readFile,
    writeFile,
} from 'fs';
import { ConfigService } from '@nestjs/config';
import { DirectoryPath } from '@src/utils/directoryPath';
import convert from 'heic-convert';
import { promisify } from 'util';
import { RmqClientService } from '../rmqClient/rmq.client.service';

@Injectable()
export class ConverterService {
    private readonly logger = new Logger(ConverterService.name);

    private readonly minioClient: Minio.Client;

    private mediaConfig = this.configService.getOrThrow('media');

    constructor(
        private readonly rmqService: RmqClientService,
        private readonly configService: ConfigService,
    ) {
        this.minioClient = new Minio.Client({
            endPoint: this.mediaConfig.region,
            port: 9000,
            accessKey: this.mediaConfig.accessKey,
            secretKey: this.mediaConfig.secretKey,
        });
    }

    async convert(
        originalMediaId: string,
        userId: string,
        s3Url: string,
        s3key: string,
    ): Promise<boolean> {
        const fileName = s3key.substring(s3key.lastIndexOf('/') + 1);
        const rawFilePath = `${DirectoryPath.raw}/${fileName}`;

        const compressedFileName = `compressed_${fileName}`;
        const compressedRawFilePath = `${DirectoryPath.raw}/${compressedFileName}`;

        try {
            await this.downloadFromS3(s3key, rawFilePath);

            // generate stream
            await this.performConverting(rawFilePath);

            // compress original file
            await this.uploadRawToS3(compressedFileName);

            // update original file db record
            this.updateRAWMediaFile(
                originalMediaId,
                compressedFileName,
                `${DirectoryPath.raw_s3}/${compressedFileName}`,
            );

            return true;
        } catch (error) {
            return false;
        } finally {
            this.cleanup(rawFilePath);
            this.cleanup(compressedRawFilePath);
        }
    }

    async performConverting(rawFilePath: string): Promise<void> {
        this.createTmpFolder(DirectoryPath.stream);

        this.logger.log(`Start perform converting for ${rawFilePath} ...`);

        try {
            console.log('asdasd');
        } catch (error) {
            this.logger.error(`Converting error for ${rawFilePath} :::`, error);
            throw error;
        }
    }

    async downloadFromS3(key: string, rawFilePath: string) {
        this.createTmpFolder(DirectoryPath.raw);

        this.logger.log(`Downloading from ${this.mediaConfig.provider}: ${key}`);

        try {
            const s3item = await this.minioClient.getObject(this.mediaConfig.bucket, key);
            const pipe = (s3item as Readable).pipe(createWriteStream(rawFilePath));
            await new Promise<void>((resolve, reject) => {
                pipe.on('finish', resolve);
                pipe.on('error', reject);
            });

            this.logger.log(`Downloaded: ${rawFilePath}`);
        } catch (error) {
            this.logger.error(`Error downloading from ${this.mediaConfig.provider}:`, error);
            throw error;
        }
    }

    async uploadRawToS3(fileName: string) {
        this.logger.log(`uploadRawToS3: Uploading to ${this.mediaConfig.provider} ...`);

        try {
            const rawFilePath = `${DirectoryPath.raw}/${fileName}`;
            const key = `${DirectoryPath.raw_s3}/${fileName}`;

            await this.minioClient
                .putObject(this.mediaConfig.bucket, key, createReadStream(rawFilePath))
                .then(async () => {
                    this.logger.log(`Uploaded: ${key}`);
                });

            this.logger.log(`Raw file successfully uploaded to ${this.mediaConfig.provider}`);
        } catch (error) {
            this.logger.error(`Error uploading raw to ${this.mediaConfig.provider}:`, error);
            throw error;
        }
    }

    updateRAWMediaFile(originalMediaId: string, fileName: string, s3Key: string) {
        const filePath = `${DirectoryPath.raw}/${fileName}`;
        const size = this.getFileSize(filePath);

        this.rmqService.updateRAWMediaFile(
            originalMediaId,
            fileName,
            size,
            this.buildMediaUrl(s3Key),
            s3Key,
        );
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

    getDirectorySize(path: string) {
        const files = readdirSync(path);

        let size = 0;

        for (let i = 0; i < files.length; i++) {
            size += statSync(`${path}/${files[i]}`).size;
        }

        return size;
    }

    getFileSize(path: string) {
        return statSync(path).size;
    }

    private buildMediaUrl(key: string) {
        return `https://${this.mediaConfig.host}/${this.mediaConfig.bucket}/${key}`;
    }

    async convertImages() {
        this.createTmpFolder(DirectoryPath.raw);
        this.createTmpFolder('tmp/png');
        const files = readdirSync(DirectoryPath.raw);
        console.log({ files });

        // eslint-disable-next-line guard-for-in,no-restricted-syntax
        for (const file of files) {
            console.log(file);
            // eslint-disable-next-line no-await-in-loop
            const inputBuffer = await promisify(readFile)(`${DirectoryPath.raw}/${file}`);
            // eslint-disable-next-line no-await-in-loop
            const outputBuffer = await convert({
                buffer: inputBuffer, // the HEIC file buffer
                format: 'PNG', // output format
            });
            // eslint-disable-next-line no-await-in-loop
            await promisify(writeFile)(
                `${DirectoryPath.png}/${file.replace('.HEIC', '.png')}`,
                // @ts-ignore
                outputBuffer,
            );
        }
    }
}
