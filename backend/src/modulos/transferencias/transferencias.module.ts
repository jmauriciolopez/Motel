import { Module } from '@nestjs/common';
import { TransferenciasService } from './transferencias.service';
import { TransferenciasController } from './transferencias.controller';
import { TransferenciaDetallesService } from './transferencia-detalles.service';
import { TransferenciaDetallesController } from './transferencia-detalles.controller';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [StockModule],
  controllers: [TransferenciasController, TransferenciaDetallesController],
  providers: [TransferenciasService, TransferenciaDetallesService],
  exports: [TransferenciasService],
})
export class TransferenciasModule {}
