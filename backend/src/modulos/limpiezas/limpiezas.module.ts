import { Module } from '@nestjs/common';
import { LimpiezasService } from './limpiezas.service';
import { LimpiezasController } from './limpiezas.controller';

@Module({
  controllers: [LimpiezasController],
  providers: [LimpiezasService],
  exports: [LimpiezasService],
})
export class LimpiezasModule {}
