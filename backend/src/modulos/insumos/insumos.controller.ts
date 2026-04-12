import {
  Controller,
  Get,
  Headers,
  Query,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { InsumosService } from './insumos.service';
import { BaseController } from '../../compartido/bases/base.controller';
import { Insumo } from '@prisma/client';
import { CrearInsumoDto } from './dto/crear-insumo.dto';
import { ActualizarInsumoDto } from './dto/actualizar-insumo.dto';
import { normalizarFiltroParaPrisma } from '../../compartido/utilidades/filtro-prisma.util';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';
import { TenantContext } from '../../compartido/interfaces/tenant-context.interface';

@Controller('insumos')
export class InsumosController extends BaseController<Insumo, CrearInsumoDto, ActualizarInsumoDto> {
  constructor(private readonly insumosService: InsumosService) {
    super(insumosService);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  override crear(@Request() req: any, @Body() body: any) {
    const tenant = req.tenant as TenantContext;
    if (!tenant?.motelId) {
      throw new BadRequestException('Indicá un motel activo');
    }

    const { deposito, usuario, motel, detalles, ...clean } = body;

    const data: CrearInsumoDto = {
      fecha: clean.Fecha ?? clean.fecha,
      observacion: clean.Observacion ?? clean.observacion,
      finalizada: clean.Finalizada ?? clean.finalizada ?? false,
      depositoId: clean.depositoId,
      motelId: tenant.motelId,
      usuarioId: req.user?.id ?? req.user?.sub,
      detalles: Array.isArray(detalles) ? detalles : [],
    };

    return this.insumosService.crear(data);
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

  @UseGuards(JwtAuthGuard)
  @Post(':id/detalles')
  agregarDetalle(@Request() req: any, @Param('id') insumoId: string, @Body() body: any) {
    const tenant = req.tenant as TenantContext;
    if (!tenant?.motelId) throw new BadRequestException('Indicá un motel activo');
    return this.insumosService.agregarDetalle(insumoId, body, tenant.motelId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/detalles/:detalleId')
  actualizarDetalle(
    @Request() req: any,
    @Param('id') insumoId: string,
    @Param('detalleId') detalleId: string,
    @Body() body: any,
  ) {
    const tenant = req.tenant as TenantContext;
    if (!tenant?.motelId) throw new BadRequestException('Indicá un motel activo');
    return this.insumosService.actualizarDetalle(insumoId, detalleId, body, tenant.motelId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/detalles/:detalleId')
  eliminarDetalle(
    @Request() req: any,
    @Param('id') insumoId: string,
    @Param('detalleId') detalleId: string,
  ) {
    const tenant = req.tenant as TenantContext;
    if (!tenant?.motelId) throw new BadRequestException('Indicá un motel activo');
    return this.insumosService.eliminarDetalle(insumoId, detalleId, tenant.motelId);
  }
}
