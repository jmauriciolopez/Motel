import {
  Controller,
  Post,
  Body,
  Request,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ConsumosService } from './consumos.service';
import { BaseController } from '../../compartido/bases/base.controller';
import { Consumo } from '@prisma/client';
import { CrearConsumoDto } from './dto/crear-consumo.dto';
import { ActualizarConsumoDto } from './dto/actualizar-consumo.dto';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';
import { TenantContext } from '../../compartido/interfaces/tenant-context.interface';

@Controller('consumos')
export class ConsumosController extends BaseController<Consumo, CrearConsumoDto, ActualizarConsumoDto> {
  constructor(private readonly consumosService: ConsumosService) {
    super(consumosService);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  override crear(@Request() req: any, @Body() body: any) {
    const tenant = req.tenant as TenantContext;
    if (!tenant?.motelId) {
      throw new BadRequestException('Indicá un motel activo');
    }
    const { producto, turno, ...clean } = body;
    return this.consumosService.crear({
      motelId: tenant.motelId,
      turnoId: clean.turnoId,
      productoId: clean.productoId,
      cantidad: clean.cantidad ?? clean.Cantidad,
      importe: clean.importe ?? clean.Importe,
    });
  }
}
