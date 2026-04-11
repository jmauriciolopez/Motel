import { Get, Post, Body, Patch, Param, Delete, Query, Request, UseGuards, ForbiddenException, BadRequestException } from '@nestjs/common';
import { BaseService } from './base.service';
import { normalizarFiltroParaPrisma } from '../utilidades/filtro-prisma.util';
import { JwtAuthGuard } from '../../modulos/autenticacion/guards/jwt-auth.guard';

export abstract class BaseController<T, CreateDto, UpdateDto> {
  constructor(protected readonly service: BaseService<T>) {}

  private parseObjectQuery(value?: string): Record<string, any> | undefined {
    if (!value) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(value);
      if (!parsed || typeof parsed !== 'object') {
        return undefined;
      }
      return normalizarFiltroParaPrisma(parsed);
    } catch {
      return undefined;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  crear(@Request() req: any, @Body() createDto: CreateDto) {
    if (req.user?.rol === 'SUPERADMIN') {
      throw new ForbiddenException('SuperAdmin no puede crear registros operativos');
    }
    const motelId: string | undefined =
      req.user?.motelId || (req.user?.moteles?.length ? req.user.moteles[0] : undefined);

    if (this.service.modelHasMotelId && !motelId) {
      throw new BadRequestException('Token sin motelId — cerrá sesión y volvé a ingresar');
    }
    const data: any = (motelId && this.service.modelHasMotelId) ? { ...createDto, motelId } : createDto;
    return this.service.crear(data);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  obtenerTodos(
    @Request() req: any,
    @Query('_page') page?: string,
    @Query('_limit') limit?: string,
    @Query('_sort') sort?: string,
    @Query('_order') order?: 'asc' | 'desc',
    @Query('filtro') filtro?: string,
    @Query('include') include?: string,
    @Query() otherQueries?: any,
  ) {
    // motelId viene del token, no del query
    const motelId: string | undefined =
      req.user?.motelId || (req.user?.moteles?.length ? req.user.moteles[0] : undefined);

    // Sanitizar otherQueries para que no incluya los parámetros de paginación
    const {
      _page,
      _limit,
      _sort,
      _order,
      motelId: _m,   // descartar si alguien lo envía igual
      filtro: _f,
      include: _i,
      ...filters
    } = otherQueries;

    const filtroAnidado = this.parseObjectQuery(filtro);
    const includeAnidado = this.parseObjectQuery(include);

    return this.service.obtenerTodos({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      sort,
      order,
      motelId,
      include: includeAnidado,
      ...filters,
    }, filtroAnidado);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  obtenerUno(
    @Param('id') id: string,
    @Query('include') include?: string,
    @Query('filtro') filtro?: string,
  ) {
    const includeAnidado = this.parseObjectQuery(include);
    const filtroAnidado = this.parseObjectQuery(filtro);
    return this.service.obtenerUno(id, includeAnidado, filtroAnidado);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  actualizar(@Request() req: any, @Param('id') id: string, @Body() updateDto: UpdateDto) {
    const motelId: string | undefined =
      req.user?.motelId || (req.user?.moteles?.length ? req.user.moteles[0] : undefined);
    const data: any = (motelId && this.service.modelHasMotelId) ? { ...updateDto, motelId } : updateDto;
    return this.service.actualizar(id, data);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  eliminar(@Param('id') id: string) {
    return this.service.eliminar(id);
  }
}
