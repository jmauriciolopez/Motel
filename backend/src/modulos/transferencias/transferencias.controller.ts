import {
  Controller,
  Post,
  Body,
  Request,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { TransferenciasService } from './transferencias.service';
import { BaseController } from '../../compartido/bases/base.controller';
import { Transferencia } from '@prisma/client';
import { CrearTransferenciaDto } from './dto/crear-transferencia.dto';
import { ActualizarTransferenciaDto } from './dto/actualizar-transferencia.dto';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';
import { TenantContext } from '../../compartido/interfaces/tenant-context.interface';

function motelIdParaOperacion(tenant: TenantContext): string {
  if (tenant.scope === 'global' && tenant.rol === RolUsuario.SUPERADMIN) {
    if (!tenant.motelId) {
      throw new BadRequestException(
        'Indicá un motel activo (x-motel-id) para operar con transferencias',
      );
    }
    return tenant.motelId;
  }
  if (!tenant.motelId) {
    throw new BadRequestException('Indicá un motel activo');
  }
  return tenant.motelId;
}

@Controller('transferencias')
export class TransferenciasController extends BaseController<
  Transferencia,
  CrearTransferenciaDto,
  ActualizarTransferenciaDto
> {
  constructor(private readonly transferenciasService: TransferenciasService) {
    super(transferenciasService);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  override crear(@Request() req: any, @Body() body: any) {
    const tenant = req.tenant as TenantContext;
    const motelId = motelIdParaOperacion(tenant);

    const {
      depositoOrigen,
      depositoDestino,
      usuario,
      motel,
      detalles,
      ...clean
    } = body;

    const data: CrearTransferenciaDto = {
      fecha: clean.Fecha ?? clean.fecha,
      observacion: clean.Observacion ?? clean.observacion,
      finalizada: false,
      motelId,
      depositoOrigenId: clean.depositoOrigenId,
      depositoDestinoId: clean.depositoDestinoId,
      usuarioId: req.user?.id ?? req.user?.sub,
      detalles: Array.isArray(detalles) ? detalles : [],
    };

    return this.transferenciasService.crear(data);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/confirmar')
  confirmar(@Request() req: any, @Param('id') id: string) {
    const tenant = req.tenant as TenantContext;
    if (!tenant) {
      throw new BadRequestException('Contexto de tenant no disponible');
    }
    const motelId = motelIdParaOperacion(tenant);
    return this.transferenciasService.confirmar(id, motelId);
  }
}
