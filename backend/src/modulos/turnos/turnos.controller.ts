import { Controller, Post, Body, Param } from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { TurnosService } from './turnos.service';
import { BaseController } from '../../compartido/bases/base.controller';
import { Turno } from '@prisma/client';
import { CrearTurnoDto } from './dto/crear-turno.dto';
import { ActualizarTurnoDto } from './dto/actualizar-turno.dto';
import { Roles } from '../../compartido/decorators/roles.decorator';
import { Tenant } from '../../compartido/decorators/tenant.decorator';
import { TenantContext } from '../../compartido/interfaces/tenant-context.interface';

@Controller('turnos')
@Roles(
  RolUsuario.SUPERADMIN,
  RolUsuario.ADMINISTRADOR,
  RolUsuario.SUPERVISOR,
  RolUsuario.RECEPCIONISTA,
)
export class TurnosController extends BaseController<
  Turno,
  CrearTurnoDto,
  ActualizarTurnoDto
> {
  constructor(private readonly turnosService: TurnosService) {
    super(turnosService);
  }

  @Post('abrir')
  abrir(@Body() crearTurnoDto: CrearTurnoDto, @Tenant() tenant: TenantContext) {
    return this.turnosService.abrirTurno(crearTurnoDto, tenant);
  }

  @Post(':id/cerrar')
  cerrar(
    @Param('id') id: string,
    @Body('usuarioCierreId') usuarioCierreId: string,
    @Body('formaPagoId') formaPagoId: string | undefined,
    @Tenant() tenant: TenantContext,
  ) {
    return this.turnosService.cerrarTurno(id, usuarioCierreId, formaPagoId, tenant);
  }
}
