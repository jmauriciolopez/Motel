import { Controller } from '@nestjs/common';
import { ComprasService } from './compras.service';
import { BaseController } from '../../compartido/bases/base.controller';
import { Compra } from '@prisma/client';
import { CrearCompraDto } from './dto/crear-compra.dto';
import { ActualizarCompraDto } from './dto/actualizar-compra.dto';

@Controller('compras')
export class ComprasController extends BaseController<Compra, CrearCompraDto, ActualizarCompraDto> {
  constructor(private readonly comprasService: ComprasService) {
    super(comprasService);
  }
}
