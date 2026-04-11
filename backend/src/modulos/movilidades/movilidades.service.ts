import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../compartido/bases/base.service';
import { Movilidad } from '@prisma/client';

@Injectable()
export class MovilidadesService extends BaseService<Movilidad> {
  constructor(prisma: PrismaService) {
    super(prisma, 'movilidad');
  }
}
