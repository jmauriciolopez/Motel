import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../compartido/bases/base.service';
import { CatalogoProducto } from '@prisma/client';

@Injectable()
export class CatalogoProductosService extends BaseService<CatalogoProducto> {
  constructor(prisma: PrismaService) {
    super(prisma, 'catalogoProducto');
  }

  async obtenerTodos(options: any) {
    // CatalogoProducto no tiene motelId, lo removemos de las opciones para evitar error en Prisma
    const { motelId, ...restOptions } = options;
    
    return super.obtenerTodos({
      ...restOptions,
      include: {
        rubro: true,
      },
    });
  }

  async obtenerUno(
    id: string,
    _include?: unknown,
    extraWhere: any = {},
    scopedMotelId?: string | null,
  ) {
    return super.obtenerUno(
      id,
      {
        rubro: true,
      },
      extraWhere,
      scopedMotelId,
    );
  }
}
