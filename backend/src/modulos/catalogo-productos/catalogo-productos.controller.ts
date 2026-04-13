import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CatalogoProductosService } from './catalogo-productos.service';
import { BaseController } from '../../compartido/bases/base.controller';
import { CatalogoProducto } from '@prisma/client';
import { CrearCatalogoProductoDto } from './dto/crear-catalogo-producto.dto';
import { ActualizarCatalogoProductoDto } from './dto/actualizar-catalogo-producto.dto';
import { AllowGlobal } from '../../compartido/decorators/allow-global.decorator';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';

@Controller('catalogo-productos')
@AllowGlobal()
export class CatalogoProductosController extends BaseController<CatalogoProducto, CrearCatalogoProductoDto, ActualizarCatalogoProductoDto> {
  constructor(private readonly catalogoProductosService: CatalogoProductosService) {
    super(catalogoProductosService);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  override obtenerTodos(
    @Query('_page') page?: string,
    @Query('_limit') limit?: string,
    @Query('_sort') sort?: string,
    @Query('_order') order?: 'asc' | 'desc',
    @Query('filtro') filtro?: string,
    @Query('include') include?: string,
  ) {
    // El catálogo es global, no tiene motelId
    const filtroAnidado = filtro ? JSON.parse(filtro) : {};
    const includeAnidado = include ? JSON.parse(include) : { rubro: true };

    return this.catalogoProductosService.obtenerTodos({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 25,
      sort: sort || 'Nombre',
      order: order || 'asc',
      include: includeAnidado,
      ...filtroAnidado,
    });
  }
}
