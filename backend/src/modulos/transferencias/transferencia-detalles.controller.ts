import {
  Controller,
  Post,
  Body,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { TransferenciaDetalle } from '@prisma/client';
import { TransferenciaDetallesService } from './transferencia-detalles.service';
import { BaseController } from '../../compartido/bases/base.controller';
import { CrearTransferenciaDetalleRecursoDto } from './dto/crear-transferencia-detalle-recurso.dto';
import { ActualizarTransferenciaDetalleRecursoDto } from './dto/actualizar-transferencia-detalle-recurso.dto';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';
import { TenantContext } from '../../compartido/interfaces/tenant-context.interface';

function motelIdParaOperacion(tenant: TenantContext): string {
  if (tenant.scope === 'global' && tenant.rol === RolUsuario.SUPERADMIN) {
    if (!tenant.motelId) {
      throw new BadRequestException(
        'Indicá un motel activo (x-motel-id) para operar con detalles de transferencia',
      );
    }
    return tenant.motelId;
  }
  if (!tenant.motelId) {
    throw new BadRequestException('Indicá un motel activo');
  }
  return tenant.motelId;
}

@Controller('transferenciadetalles')
export class TransferenciaDetallesController extends BaseController<
  TransferenciaDetalle,
  CrearTransferenciaDetalleRecursoDto,
  ActualizarTransferenciaDetalleRecursoDto
> {
  constructor(
    private readonly transferenciaDetallesService: TransferenciaDetallesService,
  ) {
    super(transferenciaDetallesService);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  override crear(@Request() req: any, @Body() body: any) {
    const tenant = req.tenant as TenantContext;
    const motelId = motelIdParaOperacion(tenant);

    const { producto, transferencia, ...clean } = body;

    const data: CrearTransferenciaDetalleRecursoDto = {
      transferenciaId: clean.transferenciaId,
      productoId: clean.productoId,
      cantidad: Number(clean.Cantidad ?? clean.cantidad),
      motelId,
    };

    return this.transferenciaDetallesService.crear(data);
  }
}
