import { Module } from '@nestjs/common';
import { TransferenciasService } from './transferencias.service';
import { TransferenciasController } from './transferencias.controller';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [StockModule],
  controllers: [TransferenciasController],
  providers: [TransferenciasService],
  exports: [TransferenciasService],
})
export class TransferenciasModule {}
