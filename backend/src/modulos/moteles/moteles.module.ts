import { Module } from '@nestjs/common';
import { MotelesService } from './moteles.service';
import { MotelesController } from './moteles.controller';

@Module({
  controllers: [MotelesController],
  providers: [MotelesService],
  exports: [MotelesService],
})
export class MotelesModule {}
