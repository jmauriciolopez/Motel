import { Module } from '@nestjs/common';
import { ComprasService } from './compras.service';
import { ComprasController } from './compras.controller';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [StockModule],
  controllers: [ComprasController],
  providers: [ComprasService],
  exports: [ComprasService],
})
export class ComprasModule {}
