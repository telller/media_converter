import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck, HealthCheckResult } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
    constructor(private health: HealthCheckService) {}

    @Get()
    @HealthCheck()
    check(): Promise<HealthCheckResult> {
        return this.health.check([]);
    }
}
