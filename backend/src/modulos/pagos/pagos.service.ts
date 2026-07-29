import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../compartido/bases/base.service';
import { Pago } from '@prisma/client';
import { CajasService } from '../cajas/cajas.service';
import { CrearPagoDto } from './dto/crear-pago.dto';

/** Devuelve true si aún hay saldo por cobrar */
function sincronizarPagoPendiente(saldo: number): boolean {
  return saldo > 0;
}

@Injectable()
export class PagosService extends BaseService<Pago> {
  constructor(
    prisma: PrismaService,
    private cajasService: CajasService,
  ) {
    super(prisma, 'pago', { hasMotelId: true });
  }

  async crear(crearPagoDto: CrearPagoDto): Promise<Pago> {
    if (crearPagoDto.Importe <= 0) {
      throw new BadRequestException('El importe debe ser mayor a cero.');
    }

    const turno = await this.prisma.turno.findUnique({
      where: { id: crearPagoDto.turnoId },
      include: {
        pagos: true,
        habitacion: true,
      },
    });

    if (!turno) throw new NotFoundException('Turno no encontrado');

    // Acepta turno abierto o cerrado, siempre que tenga saldo pendiente
    const saldoActual = Number(turno.SaldoPendiente);
    if (!sincronizarPagoPendiente(saldoActual)) {
      throw new BadRequestException('El turno no tiene saldo pendiente.');
    }

    if (crearPagoDto.Importe > saldoActual + 0.001) {
      throw new BadRequestException(
        `El importe ($${crearPagoDto.Importe.toFixed(2)}) supera el saldo pendiente ($${saldoActual.toFixed(2)}).`,
      );
    }

    const nuevoSaldo = Math.max(0, saldoActual - crearPagoDto.Importe);
    const quedaSaldo = sincronizarPagoPendiente(nuevoSaldo);

    const pago = await this.prisma.$transaction(async (tx) => {
      const nuevoPago = await tx.pago.create({
        data: crearPagoDto,
      });

      await tx.turno.update({
        where: { id: crearPagoDto.turnoId },
        data: {
          SaldoPendiente: nuevoSaldo,
          PagoPendiente: quedaSaldo,
        },
      });

      return nuevoPago;
    });

    // Concepto de caja:
    // - turno abierto + saldo queda → cobro inicial (anticipo)
    // - turno cerrado + saldo queda → cobro parcial
    // - saldo = 0                   → cobro completo / cierre
    const format = (d: Date): string => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(d.getDate())}-${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const hab = (turno as any).habitacion?.Identificador ?? '?';

    let concepto: string;
    if (!turno.Salida && quedaSaldo) {
      concepto = `Anticipo Hab.${hab} #${format(turno.Ingreso)}`;
    } else if (quedaSaldo) {
      concepto = `Cobro Parcial Hab.${hab} #${format(turno.Salida!)}`;
    } else {
      concepto = `Cobro Hab.${hab} #${format(turno.Salida ?? turno.Ingreso)}`;
    }

    await this.cajasService.crear({
      Concepto: concepto,
      Importe: Number(pago.Importe),
      motelId: pago.motelId,
      conceptoCaja: 'INGRESO',
    } as any);

    return pago;
  }

  async obtenerTodos(options: any, extraWhere: any = {}) {
    return super.obtenerTodos(
      {
        ...options,
        include: {
          formaPago: true,
          turno: {
            include: { habitacion: true, cliente: true },
          },
        },
        orderBy: options.sort ? undefined : { createdAt: 'desc' },
      },
      extraWhere,
    );
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
        formaPago: true,
        turno: {
          include: { habitacion: true, cliente: true },
        },
      },
      extraWhere,
      scopedMotelId,
    );
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

    // Discrepancia: suma de pagos del turno != Total del turno
    const discrepancias = data.filter(
      (p) => Number(p.turno?.Total || 0) !== Number(p.Importe || 0),
    );
    return { data: discrepancias, total: discrepancias.length };
  }
}
