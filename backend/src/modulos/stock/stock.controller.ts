import { Controller } from '@nestjs/common';
import { StockService } from './stock.service';
import { BaseController } from '../../compartido/bases/base.controller';
import { Stock } from '@prisma/client';
import { CrearStockDto } from './dto/crear-stock.dto';
import { ActualizarStockDto } from './dto/actualizar-stock.dto';

@Controller('stock')
export class StockController extends BaseController<Stock, CrearStockDto, ActualizarStockDto> {
  constructor(private readonly stockService: StockService) {
    super(stockService);
  }
}
