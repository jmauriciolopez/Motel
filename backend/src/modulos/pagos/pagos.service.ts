import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../compartido/bases/base.service';
import { Pago } from '@prisma/client';
import { CajasService } from '../cajas/cajas.service';
import { CrearPagoDto } from './dto/crear-pago.dto';

import { TurnoCalculator } from '../tarifas/turno-calculator';
import { agregarObservacion } from '../turnos/turnos-observaciones';

/** Devuelve true si aún hay saldo por cobrar */
function sincronizarPagoPendiente(saldo: number): boolean {
  return saldo > 0;
}

@Injectable()
export class PagosService extends BaseService<Pago> {
  constructor(
    prisma: PrismaService,
    private cajasService: CajasService,
    private turnoCalculator: TurnoCalculator,
  ) {
    super(prisma, 'pago', { hasMotelId: true });
  }

  async crear(crearPagoDto: CrearPagoDto): Promise<Pago> {
    if (crearPagoDto.Importe <= 0) {
      throw new BadRequestException('El importe debe ser mayor a cero.');
    }

    const { montoDescuento, porcentajeDescuento, ...datosPago } = crearPagoDto;
    const descuento = Math.max(0, Number(montoDescuento || 0));

    const turno = await this.prisma.turno.findUnique({
      where: { id: crearPagoDto.turnoId },
      include: {
        pagos: true,
        consumos: true,
        tarifa: true,
        habitacion: {
          include: { motel: true, tarifa: true },
        },
      },
    });

    if (!turno) throw new NotFoundException('Turno no encontrado');

    const formaPago = await this.prisma.formaPago.findUnique({
      where: { id: crearPagoDto.formaPagoId },
      select: { Tipo: true },
    });

    let totalCalculado = Number(turno.Total);
    let saldoCalculado = Number(turno.SaldoPendiente);
    let precioCalculado = turno.Precio;

    // Consumos del turno: excluidos del descuento por efectivo
    const totalConsumos = ((turno as any).consumos || []).reduce(
      (sum: number, c: any) => sum + Number(c.Importe || 0),
      0,
    );

    // Si el turno está abierto, recalcular total y saldo en tiempo real
    if (!turno.Salida && (turno.habitacion?.motel) && (turno.tarifa || turno.habitacion?.tarifa)) {
      const motel = turno.habitacion.motel;
      const tarifa = turno.tarifa || turno.habitacion.tarifa;
      try {
        const closingValues = this.turnoCalculator.calculateClosingValues(
          turno as any,
          { motel: motel as any, tarifa: tarifa as any },
        );
        const totalPagado = (turno.pagos || []).reduce(
          (sum: number, p: any) => sum + Number(p.Importe),
          0,
        );
        totalCalculado = closingValues.Total;
        saldoCalculado = Math.max(0, totalCalculado - totalPagado);
        precioCalculado = closingValues.PrecioCalculo;
      } catch (e) { /* ignore */ }
    }

    // Base sobre la que aplica el descuento: tarifa + excedente (sin consumos)
    // Se deriva siempre del total calculado, sin importar si el turno está abierto o cerrado
    const subtotalTarifa = Math.max(0, totalCalculado - totalConsumos);

    if (!sincronizarPagoPendiente(saldoCalculado)) {
      throw new BadRequestException('El turno no tiene saldo pendiente.');
    }

    // El descuento por efectivo aplica solo sobre tarifa + excedente, nunca sobre consumos
    const descuentoAplicable = Math.min(descuento, subtotalTarifa);

    if (crearPagoDto.Importe + descuentoAplicable > saldoCalculado + 0.001) {
      throw new BadRequestException(
        `El importe ($${crearPagoDto.Importe.toFixed(2)}) más el descuento ($${descuentoAplicable.toFixed(2)}) supera el saldo pendiente ($${saldoCalculado.toFixed(2)}).`,
      );
    }

    const nuevoSaldo = Math.max(0, saldoCalculado - crearPagoDto.Importe - descuentoAplicable);
    const quedaSaldo = sincronizarPagoPendiente(nuevoSaldo);

    let nuevoTotal = totalCalculado;
    let nuevaObservacion = turno.Observacion;

    if (descuentoAplicable > 0) {
      // El descuento solo afecta la tarifa; los consumos se preservan intactos
      nuevoTotal = Math.max(0, subtotalTarifa - descuentoAplicable) + totalConsumos;
      const pctTexto = porcentajeDescuento ? ` ${porcentajeDescuento}%` : '';
      const totalOrigFormatted = totalCalculado.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
      const descFormatted = descuentoAplicable.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
      const notaDescuento = `[Descuento Efectivo${pctTexto}] Total original: $${totalOrigFormatted} - Descuento: $${descFormatted}`;

      nuevaObservacion = agregarObservacion(turno.Observacion, notaDescuento);
    }

    const pago = await this.prisma.$transaction(async (tx) => {
      const nuevoPago = await tx.pago.create({
        data: datosPago,
      });

      const updateDataTurno: any = {
        Total: nuevoTotal,
        Precio: precioCalculado,
        SaldoPendiente: nuevoSaldo,
        PagoPendiente: quedaSaldo,
      };

      if (descuentoAplicable > 0) {
        updateDataTurno.Observacion = nuevaObservacion;
      }

      await tx.turno.update({
        where: { id: crearPagoDto.turnoId },
        data: updateDataTurno,
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

    const esPagoEnEfectivo = formaPago?.Tipo?.toLowerCase().includes('efectivo');
    if (esPagoEnEfectivo) {
      await this.cajasService.crear({
        Concepto: concepto,
        Importe: Number(pago.Importe),
        motelId: pago.motelId,
        conceptoCaja: 'INGRESO',
      } as any);
    }

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
