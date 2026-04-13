import { Controller, Get } from '@nestjs/common';
import { Public } from './compartido/decorators/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get('health')
  checkHealth() {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get()
  ping() {
    return 'Motel API is running';
  }
}
