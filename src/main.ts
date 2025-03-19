import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '@src/app.module';
import { VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        bufferLogs: true,
    });

    app.setGlobalPrefix('api');
    app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: '1',
    });

    const config = new DocumentBuilder().setTitle('Image converter').setVersion('0.1').build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/documentation', app, document);

    const configService = app.get<ConfigService>(ConfigService);

    const rmq = configService.getOrThrow('rmq');
    const { port } = configService.getOrThrow('app');

    app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.RMQ,
        options: {
            urls: [`amqp://${rmq.user}:${rmq.password}@${rmq.host}:${rmq.port}`],
            queue: rmq.converterQueue,
            queueOptions: {
                durable: true,
            },
            noAck: false,
            prefetchCount: 1,
        },
    });

    await app.startAllMicroservices();
    await app.listen(port);
}

bootstrap();
