import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../compartido/bases/base.service';
import { Pago } from '@prisma/client';
import { CajasService } from '../cajas/cajas.service';
import { CrearPagoDto } from './dto/crear-pago.dto';

@Injectable()
export class PagosService extends BaseService<Pago> {
  constructor(
    prisma: PrismaService,
    private cajasService: CajasService,
  ) {
    super(prisma, 'pago', { hasMotelId: true });
  }

  async crear(crearPagoDto: CrearPagoDto): Promise<Pago> {
    const turno = await this.prisma.turno.findUnique({
      where: { id: crearPagoDto.turnoId },
    });

    if (!turno) throw new NotFoundException('Turno no encontrado');
    if (turno.Estado !== 'CERRADO') {
      throw new BadRequestException('Debe cerrar el turno antes de registrar el pago.');
    }

    // Verificar si ya existe un pago para este turno
    const pagoExistente = await this.prisma.pago.findUnique({
      where: { turnoId: crearPagoDto.turnoId },
    });

    if (pagoExistente) {
      throw new BadRequestException('El turno ya tiene un pago registrado.');
    }

    const pago = await this.prisma.pago.create({
      data: crearPagoDto,
    });

    // Registro automático en Caja
    await this.cajasService.crear({
        Concepto: `Cobro Turno #${pago.turnoId.slice(-6)}`,
        Importe: Number(pago.Importe),
        motelId: pago.motelId,
        conceptoCaja: 'INGRESO', // Aseguramos que se identifique como ingreso si fuera necesario
    } as any);

    return pago;
  }

  async obtenerTodos(options: any, extraWhere: any = {}) {
    return super.obtenerTodos({
      ...options,
      include: {
        formaPago: true,
        turno: {
          include: { habitacion: true, cliente: true },
        },
      },
      orderBy: options.sort ? undefined : { createdAt: 'desc' },
    }, extraWhere);
  }

  async obtenerUno(id: string) {
    return super.obtenerUno(id, {
      formaPago: true,
      turno: {
        include: { habitacion: true, cliente: true },
      },
    });
  }

  async obtenerDiscrepancias(desde?: string, hasta?: string, motelId?: string) {
    const where: any = {
      deletedAt: null,
      turno: {
        deletedAt: null,
      },
    };

    if (motelId) {
      where.motelId = motelId;
    }

    if (desde || hasta) {
      where.turno.Salida = {
        ...(desde ? { gte: new Date(`${desde}T00:00:00.000Z`) } : {}),
        ...(hasta ? { lte: new Date(`${hasta}T23:59:59.999Z`) } : {}),
      };
    }

    const data = await this.prisma.pago.findMany({
      where,
      include: {
        formaPago: true,
        turno: {
          include: {
            habitacion: true,
            cliente: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const discrepancias = data.filter((p) => Number(p.turno?.Total || 0) !== Number(p.Importe || 0));
    return { data: discrepancias, total: discrepancias.length };
  }
}
