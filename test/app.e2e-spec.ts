import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { HealthCheckService } from '@nestjs/terminus';
import { HealthModule } from '../src/modules/health/health.module';

describe('HealthController (e2e)', () => {
    let app: INestApplication;

    const HealthCheckServiceMock = {
        check: jest.fn().mockReturnValue({ status: 'ok', info: {}, error: {}, details: {} }),
    };

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [HealthModule],
        })
            .overrideProvider(HealthCheckService)
            .useValue(HealthCheckServiceMock)
            .compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    it('/health (GET)', () => {
        return request(app.getHttpServer())
            .get('/health')
            .expect(200)
            .expect({ status: 'ok', info: {}, error: {}, details: {} });
    });

    afterAll(async () => {
        await app.close();
    });
});
