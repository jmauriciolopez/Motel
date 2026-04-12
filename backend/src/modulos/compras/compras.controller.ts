import { Controller, Post, Patch, Delete, Body, Param, Request, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { ComprasService } from './compras.service';
import { BaseController } from '../../compartido/bases/base.controller';
import { Compra } from '@prisma/client';
import { CrearCompraDto } from './dto/crear-compra.dto';
import { ActualizarCompraDto } from './dto/actualizar-compra.dto';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';
import { TenantContext } from '../../compartido/interfaces/tenant-context.interface';

@Controller('compras')
export class ComprasController extends BaseController<Compra, CrearCompraDto, ActualizarCompraDto> {
  constructor(private readonly comprasService: ComprasService) {
    super(comprasService);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  override crear(@Request() req: any, @Body() body: any) {
    const tenant = req.tenant as TenantContext;
    if (!tenant?.motelId) throw new BadRequestException('Indicá un motel activo');

    // Limpiar relaciones que react-admin inyecta, normalizar campos
    const { deposito, proveedor, usuario, motel, detalles, ...clean } = body;

    const data: CrearCompraDto = {
      fecha: clean.Fecha ?? clean.fecha,
      total: clean.Total ?? clean.total ?? 0,
      finalizada: clean.Finalizada ?? clean.finalizada ?? false,
      depositoId: clean.depositoId,
      motelId: tenant.motelId,
      usuarioId: req.user?.id ?? req.user?.sub,
      detalles: detalles ?? [],
      ...(clean.proveedorId ? { proveedorId: clean.proveedorId } : {}),
    };

    return this.comprasService.crear(data);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/detalles')
  agregarDetalle(@Request() req: any, @Param('id') compraId: string, @Body() body: any) {
    const tenant = req.tenant as TenantContext;
    if (!tenant?.motelId) throw new BadRequestException('Indicá un motel activo');
    return this.comprasService.agregarDetalle(compraId, body, tenant.motelId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/detalles/:detalleId')
  actualizarDetalle(
    @Request() req: any,
    @Param('id') compraId: string,
    @Param('detalleId') detalleId: string,
    @Body() body: any,
  ) {
    const tenant = req.tenant as TenantContext;
    if (!tenant?.motelId) throw new BadRequestException('Indicá un motel activo');
    return this.comprasService.actualizarDetalle(compraId, detalleId, body, tenant.motelId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/detalles/:detalleId')
  eliminarDetalle(
    @Request() req: any,
    @Param('id') compraId: string,
    @Param('detalleId') detalleId: string,
  ) {
    const tenant = req.tenant as TenantContext;
    if (!tenant?.motelId) throw new BadRequestException('Indicá un motel activo');
    return this.comprasService.eliminarDetalle(compraId, detalleId, tenant.motelId);
  }
}
