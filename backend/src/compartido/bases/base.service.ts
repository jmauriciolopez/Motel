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
    const dmmf = (prisma as any)._baseDmmf?.modelMap?.[modelName]
      ?? (prisma as any)._dmmf?.modelMap?.[modelName];
    const fields: string[] = dmmf?.fields?.map((f: any) => f.name) ?? [];
    this.hasSoftDelete = fields.includes('deletedAt');
    // Preferir declaración explícita sobre introspección (DMMF no siempre disponible)
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

  async obtenerTodos(options: PaginationOptions, extraWhere: any = {}): Promise<{ data: T[]; total: number }> {
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

    // Filtros adicionales que vengan en options (excepto campos de sistema)
    const { page: _p, limit: _l, sort: _s, order: _o, motelId: _m, include, orderBy: _ob, ...filters } = options;
    const filtrosNormalizados = normalizarFiltroParaPrisma(filters);
    Object.assign(where, filtrosNormalizados);

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

  async obtenerUno(id: string, motelId: string, include?: any, extraWhere: any = {}): Promise<T> {
    return this.model.findFirst({
      where: { id, motelId, ...extraWhere },
      include,
    });
  }

  async actualizar(id: string, data: any,motelId: string): Promise<T> {
    return this.model.update({
      where: { id,motelId },
      data,
    });
  }

  async eliminar(id: string,motelId: string): Promise<T> {
    // Si el modelo tiene deletedAt, hacemos soft delete, si no, delete físico
    try {
      return await this.model.update({
        where: { id,motelId },
        data: { deletedAt: new Date() },
      });
    } catch {
      return this.model.delete({
        where: { id },
      });
    }
  }
}
