import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { HealthService } from './health.service';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async checkHealth() {
    const health = await this.healthService.checkHealth();
    if (health.status !== 'healthy') {
      return {
        ...health,
        status: health.status,
      };
    }
    return health;
  }

  @Get('database')
  @HttpCode(HttpStatus.OK)
  async checkDatabase() {
    const result = await this.healthService.checkDatabase();
    if (!result.connected) {
      return {
        ...result,
        status: 'down',
      };
    }
    return {
      ...result,
      status: 'up',
    };
  }

  @Get('ping')
  @HttpCode(HttpStatus.OK)
  async ping() {
    return this.healthService.ping();
  }

  @Get('ready')
  @HttpCode(HttpStatus.OK)
  async ready() {
    const result = await this.healthService.ready();
    if (!result.ready) {
      return {
        ...result,
        ready: false,
      };
    }
    return result;
  }

  @Get('info')
  @HttpCode(HttpStatus.OK)
  async info() {
    return this.healthService.getInfo();
  }

  @Get('metrics')
  @HttpCode(HttpStatus.OK)
  async metrics() {
    return this.healthService.getMetrics();
  }
}
