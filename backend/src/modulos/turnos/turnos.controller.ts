import {
  Controller,
  Post,
  Body,
  Param,
  Request,
  BadRequestException,
  Get,
  Query,
} from '@nestjs/common';
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

  @Get('reporte-completados')
  reporteCompletados(
    @Query('fechaDesde') fechaDesde: string,
    @Query('fechaHasta') fechaHasta: string,
    @Query('horaCierre') horaCierre: string,
    @Query('_page') page?: string,
    @Query('_limit') limit?: string,
    @Tenant() tenant?: TenantContext,
  ) {
    return this.turnosService.obtenerTurnosCompletados({
      fechaDesde,
      fechaHasta,
      horaCierre,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
      motelId: tenant?.motelId,
    });
  }

  @Post('abrir')
  abrir(@Body() crearTurnoDto: CrearTurnoDto, @Tenant() tenant: TenantContext) {
    return this.turnosService.abrirTurno(crearTurnoDto, tenant);
  }

  @Post(':id/cerrar')
  cerrar(
    @Param('id') id: string,
    @Request() req: { user?: { id?: string; sub?: string } },
    @Tenant() tenant: TenantContext,
  ) {
    const usuarioCierreId = req.user?.id ?? req.user?.sub ?? '';
    if (!usuarioCierreId) {
      throw new BadRequestException(
        'Usuario no identificado para cerrar turno',
      );
    }
    return this.turnosService.cerrarTurno(id, usuarioCierreId, tenant);
  }
}
