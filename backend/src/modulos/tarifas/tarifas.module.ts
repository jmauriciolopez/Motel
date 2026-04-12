import { Module } from '@nestjs/common';
import { TarifasService } from './tarifas.service';
import { TarifasController } from './tarifas.controller';
import { MotorTarifarioService } from './motor-tarifario.service';

@Module({
  controllers: [TarifasController],
  providers: [TarifasService, MotorTarifarioService],
  exports: [TarifasService, MotorTarifarioService],
})
export class TarifasModule {}
