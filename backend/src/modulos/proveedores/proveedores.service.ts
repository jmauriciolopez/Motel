import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../compartido/bases/base.service';
import { Proveedor } from '@prisma/client';

@Injectable()
export class ProveedoresService extends BaseService<Proveedor> {
  constructor(prisma: PrismaService) {
    super(prisma, 'proveedor');
  }

  async obtenerTodos(options: any) {
    return super.obtenerTodos({
      ...options,
      include: { rubro: true },
    });
  }

  async obtenerUno(id: string) {
    return super.obtenerUno(id, { rubro: true });
  }
}
