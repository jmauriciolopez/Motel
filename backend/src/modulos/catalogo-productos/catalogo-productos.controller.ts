import { Controller } from '@nestjs/common';
import { CatalogoProductosService } from './catalogo-productos.service';
import { BaseController } from '../../compartido/bases/base.controller';
import { CatalogoProducto } from '@prisma/client';
import { CrearCatalogoProductoDto } from './dto/crear-catalogo-producto.dto';
import { ActualizarCatalogoProductoDto } from './dto/actualizar-catalogo-producto.dto';

@Controller('catalogo-productos')
export class CatalogoProductosController extends BaseController<CatalogoProducto, CrearCatalogoProductoDto, ActualizarCatalogoProductoDto> {
  constructor(private readonly catalogoProductosService: CatalogoProductosService) {
    super(catalogoProductosService);
  }
}
