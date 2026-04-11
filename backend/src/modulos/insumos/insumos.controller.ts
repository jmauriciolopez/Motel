import { Controller, Get, Headers, Query } from '@nestjs/common';
import { InsumosService } from './insumos.service';
import { BaseController } from '../../compartido/bases/base.controller';
import { Insumo } from '@prisma/client';
import { CrearInsumoDto } from './dto/crear-insumo.dto';
import { ActualizarInsumoDto } from './dto/actualizar-insumo.dto';
import { normalizarFiltroParaPrisma } from '../../compartido/utilidades/filtro-prisma.util';

@Controller('insumos')
export class InsumosController extends BaseController<Insumo, CrearInsumoDto, ActualizarInsumoDto> {
  constructor(private readonly insumosService: InsumosService) {
    super(insumosService);
  }

  @Get('detalles')
  obtenerDetalles(
    @Query('motelId') motelIdQuery?: string,
    @Headers('x-motel-id') motelIdHeader?: string,
    @Query('_page') page?: string,
    @Query('_limit') limit?: string,
    @Query('_sort') sort?: string,
    @Query('_order') order?: 'asc' | 'desc',
    @Query('filtro') filtro?: string,
  ) {
    let extraWhere: any = {};
    if (filtro) {
      try {
        extraWhere = normalizarFiltroParaPrisma(JSON.parse(filtro));
      } catch {
        extraWhere = {};
      }
    }

    return this.insumosService.obtenerDetalles({
      motelId: motelIdQuery || motelIdHeader,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      sort,
      order,
    }, extraWhere);
  }
}
