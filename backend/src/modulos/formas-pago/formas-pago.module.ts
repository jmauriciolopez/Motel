import { Module } from '@nestjs/common';
import { FormasPagoService } from './formas-pago.service';
import { FormasPagoController } from './formas-pago.controller';

@Module({
  controllers: [FormasPagoController],
  providers: [FormasPagoService],
  exports: [FormasPagoService],
})
export class FormasPagoModule {}
