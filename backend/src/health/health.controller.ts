import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';

@Public()
@Controller()
export class HealthController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  ready() {
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }
}
