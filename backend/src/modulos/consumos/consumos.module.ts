import { Module } from '@nestjs/common';
import { ConsumosService } from './consumos.service';
import { ConsumosController } from './consumos.controller';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [StockModule],
  controllers: [ConsumosController],
  providers: [ConsumosService],
  exports: [ConsumosService],
})
export class ConsumosModule {}
