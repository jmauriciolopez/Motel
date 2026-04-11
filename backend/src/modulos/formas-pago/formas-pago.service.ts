import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../compartido/bases/base.service';
import { FormaPago } from '@prisma/client';

@Injectable()
export class FormasPagoService extends BaseService<FormaPago> {
  constructor(prisma: PrismaService) {
    super(prisma, 'formaPago');
  }
}
