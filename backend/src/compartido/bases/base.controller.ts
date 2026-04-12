import {
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { BaseService } from './base.service';
import { normalizarFiltroParaPrisma } from '../utilidades/filtro-prisma.util';
import { JwtAuthGuard } from '../../modulos/autenticacion/guards/jwt-auth.guard';
import { TenantContext } from '../interfaces/tenant-context.interface';

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

  private scopedMotelId(tenant: TenantContext): string | null | undefined {
    if (tenant.scope === 'global' && tenant.rol === RolUsuario.SUPERADMIN) {
      return null;
    }
    return tenant.motelId ?? undefined;
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  crear(@Request() req: any, @Body() createDto: CreateDto) {
    const tenant = req.tenant as TenantContext;
    if (!tenant) {
      throw new BadRequestException('Contexto de tenant no disponible');
    }

    const motelId =
      tenant.scope === 'global' ? undefined : tenant.motelId ?? undefined;

    if (
      tenant.rol === RolUsuario.SUPERADMIN &&
      tenant.scope === 'global' &&
      this.service.modelHasMotelId
    ) {
      throw new ForbiddenException(
        'SuperAdmin debe indicar un motel (x-motel-id) para crear registros de este tipo',
      );
    }

    if (this.service.modelHasMotelId && !motelId) {
      throw new BadRequestException(
        'Indicá un motel activo (x-motel-id) para crear registros',
      );
    }

    const data: any =
      motelId && this.service.modelHasMotelId
        ? { ...createDto, motelId }
        : createDto;
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
    const tenant = req.tenant as TenantContext;
    if (!tenant) {
      throw new BadRequestException('Contexto de tenant no disponible');
    }

    const motelId =
      tenant.scope === 'global' && tenant.rol === RolUsuario.SUPERADMIN
        ? undefined
        : tenant.motelId ?? undefined;

    const {
      _page,
      _limit,
      _sort,
      _order,
      motelId: _m,
      filtro: _f,
      include: _i,
      ...filters
    } = otherQueries;

    const filtroAnidado = this.parseObjectQuery(filtro);
    const includeAnidado = this.parseObjectQuery(include);

    return this.service.obtenerTodos(
      {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        sort,
        order,
        motelId,
        include: includeAnidado,
        ...filters,
      },
      filtroAnidado,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  obtenerUno(
    @Request() req: any,
    @Param('id') id: string,
    @Query('include') include?: string,
    @Query('filtro') filtro?: string,
  ) {
    const tenant = req.tenant as TenantContext;
    if (!tenant) {
      throw new BadRequestException('Contexto de tenant no disponible');
    }

    const includeAnidado = this.parseObjectQuery(include);
    const filtroAnidado = this.parseObjectQuery(filtro);
    const scopedMotelId = this.scopedMotelId(tenant);
    return this.service.obtenerUno(
      id,
      includeAnidado,
      filtroAnidado,
      scopedMotelId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  actualizar(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateDto,
  ) {
    const tenant = req.tenant as TenantContext;
    if (!tenant) {
      throw new BadRequestException('Contexto de tenant no disponible');
    }

    const motelId =
      tenant.scope === 'global' ? undefined : tenant.motelId ?? undefined;
    const data: any =
      motelId && this.service.modelHasMotelId
        ? { ...updateDto, motelId }
        : updateDto;
    const scopedMotelId = this.scopedMotelId(tenant);
    return this.service.actualizar(id, data, scopedMotelId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  eliminar(@Request() req: any, @Param('id') id: string) {
    const tenant = req.tenant as TenantContext;
    if (!tenant) {
      throw new BadRequestException('Contexto de tenant no disponible');
    }

    const scopedMotelId = this.scopedMotelId(tenant);
    return this.service.eliminar(id, scopedMotelId);
  }
}
