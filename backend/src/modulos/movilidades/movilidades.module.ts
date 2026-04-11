import { Module } from '@nestjs/common';
import { MovilidadesService } from './movilidades.service';
import { MovilidadesController } from './movilidades.controller';

@Module({
  controllers: [MovilidadesController],
  providers: [MovilidadesService],
  exports: [MovilidadesService],
})
export class MovilidadesModule {}
