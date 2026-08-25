import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Utility for calculating turno-related values (durations, prices, extras).
 * Converted from turno-calculator.js
 */

interface Motel {
  InicioDia: Date | string | null;
  InicioNoche: Date | string | null;
  CheckOutDia: Date | string | null;
  HorarioUnico: boolean;
  DuracionDiaria: number;
  DuracionNocturna: number;
  Tolerancia?: number | null;
  MaxHrAdicional?: number | null;
  /** Array de días de la semana con duración extendida (0=domingo … 6=sábado) */
  DiasEspeciales?: number[] | null;
  /** Horas extra a sumar en días especiales (solo aplica a estadías Standard) */
  HorasExtraEspeciales?: number | null;
  AplicaCorteCheckout?: boolean;
}

interface Tarifa {
  PrecioTurno: number | Decimal;
  PrecioTurnoPromocional?: number | Decimal | null;
  PrecioDiario?: number | Decimal | null;
  PrecioHrDiaExcede: number | Decimal;
  PrecioHrNocheExcede?: number | Decimal | null;
}

interface Habitacion {
  motel: Motel;
  tarifa: Tarifa;
}

export interface InitialValues {
  Minutos: number;
  Precio: number;
  PrecioCalculo: number;
  Total: number;
  Activo: boolean;
}

interface Turno {
  Ingreso: Date | string;
  Minutos?: number;
  Precio?: number;
  Total: number;
}

export interface ClosingValues {
  Salida: Date;
  PrecioCalculo: number;
  Total: number;
}

/**
 * Extrae descuentos en efectivo persistidos en Observacion.
 * Formato generado: `[Descuento Efectivo 10%] Total original: $80.000 - Descuento: $8.000`
 */
export function extraerMontoDescuentoDeObservacion(obs?: string | null): number {
  if (!obs) return 0;
  const re = /Descuento:\s*\$?\s*([\d.]+(?:,\d+)?)/gi;
  let total = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(obs)) !== null) {
    const raw = match[1];
    const partes = raw.split('.');
    const normalized = raw.includes(',')
      ? raw.replace(/\./g, '').replace(',', '.')
      : partes.length === 2 && partes[1].length <= 2
        ? raw
        : raw.replace(/\./g, '');
    total += Number(normalized) || 0;
  }
  return total;
}

@Injectable()
export class TurnoCalculator {
  /**
   * Helper function to get hour from a datetime field
   */
  private getHour(d: Date | string | null): number {
    if (!d) return 0;
    return new Date(d).getHours();
  }

  /**
   * Helper function to get minutes from a datetime field
   */
  private getMin(d: Date | string | null): number {
    if (!d) return 0;
    return new Date(d).getMinutes();
  }

  /**
   * Convert Decimal to number
   */
  private toNumber(value: number | Decimal | string | null | undefined): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') return Number(value) || 0;
    if (typeof (value as Decimal).toNumber === 'function') {
      return (value as Decimal).toNumber();
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  /**
   * Determina si la fecha de ingreso cae dentro del período especial del motel.
   *
   * Reglas:
   * - Si HorarioUnico: aplica todo el día calendario marcado como especial.
   * - Si tiene franjas día/noche: el período especial es la franja nocturna
   *   (desde InicioNoche hasta InicioDia). La madrugada se asigna al día anterior.
   */
  private isInPeriodoEspecial(date: Date, motel: Motel): boolean {
    const diasEspeciales = Array.isArray(motel.DiasEspeciales)
      ? (motel.DiasEspeciales as number[])
      : [];
    if (diasEspeciales.length === 0 || (motel.HorasExtraEspeciales ?? 0) <= 0) return false;

    const hours = date.getHours();
    // const iniciodia = this.getHour(motel.InicioDia);
    // const inicionoche = this.getHour(motel.InicioNoche);
    const inicioDiaDate = motel.InicioDia ? new Date(motel.InicioDia) : null;
    const iniciodia = inicioDiaDate?.getUTCHours() ?? 0;
    const inicionocheDate = motel.InicioNoche ? new Date(motel.InicioNoche) : null;
    const inicionoche = inicionocheDate?.getUTCHours() ?? 0;
    // Día "efectivo": la madrugada (antes de InicioDia) pertenece al día anterior
    let diaEfectivo = date.getDay();
    if (!diasEspeciales.includes(diaEfectivo)) return false;

    if (hours >= iniciodia && hours < inicionoche - 1) {
      return true;
    }

    return false;
  }

  /**
   * Calculate initial values for a turno
   */
  calculateInitialValues(
    habitacion: Habitacion,
    customIngreso: Date | string | null = null,
    tipoEstancia: 'Pernocte' | 'Standard' | null = null,
  ): InitialValues {
    const { motel, tarifa } = habitacion;
    const date = customIngreso ? new Date(customIngreso) : new Date();
    const hours = date.getHours();
    const inicioDiaDate = motel.InicioDia ? new Date(motel.InicioDia) : null;
    const iniciodia = inicioDiaDate?.getUTCHours() ?? 0;
    const inicionocheDate = motel.InicioNoche ? new Date(motel.InicioNoche) : null;
    const inicionoche = inicionocheDate?.getUTCHours() ?? 0;

    // Determine if it's day or night time for duration
    let isDayTime: boolean;
    if (tipoEstancia === 'Pernocte') {
      isDayTime = false;
    } else if (tipoEstancia === 'Standard') {
      isDayTime = true;
    } else {
      if (motel.HorarioUnico) {
        isDayTime = true;
      } else {
        if (inicionoche > iniciodia) {
          isDayTime = hours >= iniciodia && hours < inicionoche;
        } else {
          isDayTime = hours >= iniciodia || hours < inicionoche;
        }
      }
    }

    // Base duration according to start time
    let totalMinutes: number;
    let basePrice: number;

    if (tipoEstancia === 'Pernocte') {
      const checkOutH = this.getHour(motel.CheckOutDia);
      const checkOutM = this.getMin(motel.CheckOutDia);

      const limitDate = new Date(date);
      limitDate.setHours(checkOutH, checkOutM, 0, 0);

      if (limitDate < date) {
        limitDate.setDate(limitDate.getDate() + 1);
      }

      totalMinutes = Math.floor((limitDate.getTime() - date.getTime()) / 60000);
      basePrice = this.toNumber(tarifa.PrecioDiario) || this.toNumber(tarifa.PrecioTurno);
    } else {
      const baseDuration = isDayTime ? motel.DuracionDiaria : motel.DuracionNocturna;
      totalMinutes = baseDuration * 60;
      basePrice = isDayTime
        ? (this.toNumber(tarifa.PrecioTurnoPromocional) || this.toNumber(tarifa.PrecioTurno))
        : this.toNumber(tarifa.PrecioTurno);

      // Días especiales: agregar horas extra si el ingreso cae en período especial
      // No aplica a Pernocte (su duración está determinada por CheckOutDia — rama if anterior)
      if (this.isInPeriodoEspecial(date, motel)) {
        totalMinutes += (motel.HorasExtraEspeciales as number) * 60;
      }

      // Minutos extra asignados directamente a la tarifa
      if ((tarifa as any).MinutosExtra && Number((tarifa as any).MinutosExtra) > 0) {
        totalMinutes += Number((tarifa as any).MinutosExtra);
      }

      if (isDayTime && motel.AplicaCorteCheckout) {
        const checkOutH = this.getHour(motel.CheckOutDia);
        const checkOutM = this.getMin(motel.CheckOutDia);

        const limitDate = new Date(date);
        limitDate.setHours(checkOutH, checkOutM, 0, 0);

        if (limitDate < date) {
          limitDate.setDate(limitDate.getDate() + 1);
        }

        const minutesUntilLimit = Math.floor(
          (limitDate.getTime() - date.getTime()) / 60000,
        );

        if (minutesUntilLimit < totalMinutes) {
          totalMinutes = minutesUntilLimit;
        }
      }
    }

    return {
      Minutos: totalMinutes,
      Precio: basePrice,
      PrecioCalculo: basePrice,
      Total: basePrice,
      Activo: true,
    };
  }

  /**
   * Calculate closing values for a turno
   */
  calculateClosingValues(elturno: Turno, habitacion: Habitacion): ClosingValues {
    const { motel, tarifa } = habitacion;
    const salida = new Date();
    const hours = salida.getHours();

    const iniciodia = this.getHour(motel.InicioDia);
    const inicionoche = this.getHour(motel.InicioNoche);

    let isDayTime: boolean;
    if (motel.HorarioUnico) {
      isDayTime = true;
    } else {
      if (inicionoche > iniciodia) {
        isDayTime = hours >= iniciodia && hours < inicionoche;
      } else {
        isDayTime = hours >= iniciodia || hours < inicionoche;
      }
    }

    const permanencia = salida.getTime() - new Date(elturno.Ingreso).getTime();
    const minutosPermanencia = Math.floor(permanencia / 60000);
    const turnoMinutos = elturno.Minutos || (motel.DuracionDiaria ? motel.DuracionDiaria * 60 : 120);
    const demora = minutosPermanencia - turnoMinutos;
    const tolerancia = motel.Tolerancia || 0;
    const maxdemora = (motel.MaxHrAdicional || 0) * 60;

    let extra = 0;
    const precioBase = this.toNumber(tarifa.PrecioTurno) || elturno.Precio || 0;
    let newPrecioCalculo = precioBase;

    // Sumar consumos si existen
    const totalConsumos = ((elturno as any).consumos || []).reduce(
      (sum: number, c: any) => sum + this.toNumber(c.Importe),
      0,
    );

    // Dynamic extra calculation
    if (demora > tolerancia) {
      if (maxdemora > 0 && demora > maxdemora) {
        newPrecioCalculo = this.toNumber(tarifa.PrecioDiario) || precioBase;
        extra = newPrecioCalculo - precioBase;
      } else {
        const configuredRate = isDayTime
          ? this.toNumber(tarifa.PrecioHrDiaExcede)
          : (this.toNumber(tarifa.PrecioHrNocheExcede) || this.toNumber(tarifa.PrecioHrDiaExcede));

        if (configuredRate > 0) {
          const cantHorasExtra = Math.ceil(demora / 60);
          extra = configuredRate * cantHorasExtra;
        } else {
          const baseDuration = turnoMinutos > 0 ? turnoMinutos : 60;
          const cantTurnosExtra = Math.ceil(demora / baseDuration);
          extra = precioBase * cantTurnosExtra;
        }

        newPrecioCalculo = precioBase + extra;
      }
    }

    const totalSinDescuentos = precioBase + totalConsumos + extra;
    const totalDb = this.toNumber(elturno.Total);
    const descuentoObs = extraerMontoDescuentoDeObservacion((elturno as any).Observacion);

    // Si el total persistido ya incluye extras (es mayor al precio base + consumos)
    // y es menor al bruto actual, la diferencia es un descuento ya aplicado.
    const baseMasConsumos = precioBase + totalConsumos;
    const descuentoInferido =
      totalDb > baseMasConsumos + 0.001
        ? Math.max(0, totalSinDescuentos - totalDb)
        : 0;

    const descuento = Math.max(descuentoObs, descuentoInferido);
    const newTotal = Math.max(0, totalSinDescuentos - descuento);

    return {
      Salida: salida,
      PrecioCalculo: newPrecioCalculo,
      Total: newTotal,
    };
  }
}
