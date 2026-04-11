import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MotelesService } from './moteles.service';
import { BaseController } from '../../compartido/bases/base.controller';
import { Motel } from '@prisma/client';
import { CrearMotelDto } from './dto/crear-motel.dto';
import { ActualizarMotelDto } from './dto/actualizar-motel.dto';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';
import { UsuarioActual } from '../autenticacion/decoradores/usuario-actual.decorador';

@Controller('moteles')
export class MotelesController extends BaseController<Motel, CrearMotelDto, ActualizarMotelDto> {
  constructor(private readonly motelesService: MotelesService) {
    super(motelesService);
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
    @UsuarioActual() usuario?: any,
  ) {
    const isSuperAdmin = usuario?.rol === 'SUPERADMIN';
    const propietarioId = usuario?.propietarioId;
    const allowedMoteles = usuario?.moteles || [];

    // Lógica de Aislamiento de Seguridad
    const extraWhere: any = {};

    if (!isSuperAdmin) {
      if (propietarioId) {
        // Si es Dueño/Administrador, solo ve los moteles de su propietarioId
        extraWhere.propietarioId = propietarioId;
      } else {
        // Si es Personal (Recepcionista/Staff), solo ve los moteles que tiene asignados
        extraWhere.id = { in: allowedMoteles };
      }
    }

    // Parseo de parámetros para compatibilidad con react-admin
    const nestedFiltro = filtro ? JSON.parse(filtro) : {};
    const nestedInclude = include ? JSON.parse(include) : { propietario: true };

    return this.service.obtenerTodos({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 25,
      sort: sort || 'Nombre',
      order: order || 'asc',
      include: nestedInclude,
      ...nestedFiltro,
    }, extraWhere);
  }
}
