import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../compartido/bases/base.service';
import { Caja } from '@prisma/client';
import { CrearCajaDto } from './dto/cajas.dto';

@Injectable()
export class CajasService extends BaseService<Caja> {
  constructor(prisma: PrismaService) {
    super(prisma, 'caja', { hasMotelId: true });
  }

  async crear(data: CrearCajaDto): Promise<Caja> {
    console.log('[CajasService.crear] data recibido:', JSON.stringify(data));
    const { motelId, Importe, Concepto, createdAt } = data;

    if (!motelId) throw new Error('motelId requerido');

    const ultimoMovimiento = await this.prisma.caja.findFirst({
      where: { motelId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    const saldoAnterior = ultimoMovimiento ? Number(ultimoMovimiento.Saldo) : 0;
    const nuevoSaldo = saldoAnterior + Number(Importe);

    return this.prisma.caja.create({
      data: {
        Concepto,
        Importe,
        Saldo: nuevoSaldo,
        motelId,          // narrowed to string after the guard above
        createdAt: createdAt || new Date(),
      },
    });
  }

  // Sobrescribimos obtenerTodos para asegurar que el orden por defecto sea createdAt desc
  async obtenerTodos(options: any) {
    if (!options.sort) {
       options.sort = 'createdAt';
       options.order = 'desc';
    }
    return super.obtenerTodos(options);
  }
}
