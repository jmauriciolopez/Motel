import { Module } from '@nestjs/common';
import { TarifasService } from './tarifas.service';
import { TarifasController } from './tarifas.controller';
import { MotorTarifarioService } from './motor-tarifario.service';
import { TurnoCalculator } from './turno-calculator';

@Module({
  controllers: [TarifasController],
  providers: [TarifasService, MotorTarifarioService, TurnoCalculator],
  exports: [TarifasService, MotorTarifarioService, TurnoCalculator],
})
export class TarifasModule {}
