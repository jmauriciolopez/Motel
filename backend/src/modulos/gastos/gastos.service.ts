import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../compartido/bases/base.service';
import { Gasto } from '@prisma/client';

@Injectable()
export class GastosService extends BaseService<Gasto> {
  constructor(prisma: PrismaService) {
    super(prisma, 'gasto', { hasMotelId: true });
  }
}
