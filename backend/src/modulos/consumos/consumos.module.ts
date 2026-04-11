import { Module } from '@nestjs/common';
import { ConsumosService } from './consumos.service';
import { ConsumosController } from './consumos.controller';

@Module({
  controllers: [ConsumosController],
  providers: [ConsumosService],
  exports: [ConsumosService],
})
export class ConsumosModule {}
