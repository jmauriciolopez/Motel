import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizarFiltroParaPrisma } from '../utilidades/filtro-prisma.util';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  motelId?: string;
  include?: any;
  [key: string]: any;
}

export abstract class BaseService<T> {
  private readonly hasSoftDelete: boolean;
  readonly hasMotelId: boolean;

  constructor(
    protected prisma: PrismaService,
    protected modelName: string,
    options: { hasMotelId?: boolean } = {},
  ) {
    const dmmf =
      (prisma as any)._baseDmmf?.modelMap?.[modelName] ??
      (prisma as any)._dmmf?.modelMap?.[modelName];
    const fields: string[] = dmmf?.fields?.map((f: any) => f.name) ?? [];
    this.hasSoftDelete = fields.includes('deletedAt');
    this.hasMotelId = options.hasMotelId ?? fields.includes('motelId');
  }

  get model() {
    return this.prisma[this.modelName];
  }

  get modelHasMotelId(): boolean {
    return this.hasMotelId;
  }

  async crear(data: any): Promise<T> {
    return this.model.create({ data });
  }

  private aplicarFiltrosVirtuales(where: any, filtrosNormalizados: any): void {
    if (filtrosNormalizados.existe === true) {
      if (this.hasSoftDelete) {
        where.deletedAt = null;
      }
      delete filtrosNormalizados.existe;
      return;
    }

    if (filtrosNormalizados.existe === false) {
      if (this.hasSoftDelete) {
        where.deletedAt = { not: null };
      }
      delete filtrosNormalizados.existe;
      return;
    }

    delete filtrosNormalizados.existe;
  }

  async obtenerTodos(
    options: PaginationOptions,
    extraWhere: any = {},
  ): Promise<{ data: T[]; total: number }> {
    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 10;
    const skip = (page - 1) * limit;

    const sort = options.sort || 'createdAt';
    const order = options.order?.toLowerCase() === 'desc' ? 'desc' : 'asc';

    const where: any = { ...extraWhere };

    if (this.hasSoftDelete) {
      where.deletedAt = null;
    }

    if (options.motelId && this.hasMotelId) {
      where.motelId = options.motelId;
    }

    const {
      page: _p,
      limit: _l,
      sort: _s,
      order: _o,
      motelId: _m,
      include,
      orderBy: _ob,
      ...filters
    } = options;

    const filtrosNormalizados = normalizarFiltroParaPrisma(filters);

    this.aplicarFiltrosVirtuales(where, filtrosNormalizados);
    Object.assign(where, filtrosNormalizados);

    try {
      const [data, total] = await Promise.all([
        this.model.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sort]: order },
          include,
        }),
        this.model.count({ where }),
      ]);

      return { data, total };
    }
    catch (error) {
      console.error('PRISMA ERROR FULL:', error);
      //   console.error('PRISMA ERROR META:', error?.meta?.target);
      throw error;
    }
  }
  /**
   * @param scopedMotelId string filtra por ese motel; null = superadmin global (sin filtro motel); undefined solo modelos sin hasMotelId
   */
  async obtenerUno(
    id: string,
    include?: any,
    extraWhere: any = {},
    scopedMotelId?: string | null,
  ): Promise<T | null> {
    const where: any = { id, ...extraWhere };

    if (this.hasSoftDelete) {
      where.deletedAt = null;
    }

    if (this.hasMotelId) {
      if (scopedMotelId !== undefined && scopedMotelId !== null) {
        where.motelId = scopedMotelId;
      }
    }

    return this.model.findFirst({
      where,
      include,
    });
  }

  async actualizar(id: string, data: any, scopedMotelId?: string | null): Promise<T> {
    if (!this.hasMotelId) {
      return this.model.update({
        where: { id },
        data,
      });
    }

    const where: any = { id };
    if (this.hasSoftDelete) {
      where.deletedAt = null;
    }
    if (scopedMotelId !== undefined && scopedMotelId !== null) {
      where.motelId = scopedMotelId;
    }

    const existing = await this.model.findFirst({ where });
    if (!existing) {
      throw new NotFoundException('Registro no encontrado');
    }

    return this.model.update({
      where: { id: existing.id },
      data,
    });
  }

  async eliminar(id: string, scopedMotelId?: string | null): Promise<T> {
    if (!this.hasMotelId) {
      try {
        return await this.model.update({
          where: { id },
          data: { deletedAt: new Date() },
        });
      } catch {
        return this.model.delete({
          where: { id },
        });
      }
    }

    const where: any = { id };
    if (this.hasSoftDelete) {
      where.deletedAt = null;
    }
    if (scopedMotelId !== undefined && scopedMotelId !== null) {
      where.motelId = scopedMotelId;
    }

    const existing = await this.model.findFirst({ where });
    if (!existing) {
      throw new NotFoundException('Registro no encontrado');
    }

    try {
      return await this.model.update({
        where: { id: existing.id },
        data: { deletedAt: new Date() },
      });
    } catch {
      return this.model.delete({
        where: { id: existing.id },
      });
    }
  }
}
