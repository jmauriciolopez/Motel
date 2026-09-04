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
  Salida?: Date | string | null;
  Minutos?: number;
  Precio?: number;
  Total: number;
}

export interface ClosingValues {
  Salida: Date;
  PrecioCalculo: number;
  Total: number;
  /** Subtotal de tarifa + excedente (sin consumos). Base sobre la que aplica el descuento por efectivo. */
  SubtotalTarifa: number;
  /** Subtotal de consumos del turno. Excluido del descuento por efectivo. */
  SubtotalConsumos: number;
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
  private readonly timeZone = process.env.MOTEL_TIMEZONE || 'America/Argentina/Buenos_Aires';

  /** Motel schedule fields are wall-clock values stored on a UTC anchor date. */
  private getHour(d: Date | string | null): number {
    if (!d) return 0;
    if (typeof d === 'string' && /^\d{1,2}:\d{2}/.test(d)) {
      return Number(d.slice(0, 2));
    }
    return new Date(d).getUTCHours();
  }

  private getMin(d: Date | string | null): number {
    if (!d) return 0;
    if (typeof d === 'string' && /^\d{1,2}:\d{2}/.test(d)) {
      return Number(d.slice(3, 5));
    }
    return new Date(d).getUTCMinutes();
  }

  private getBusinessParts(date: Date): { hour: number; minute: number; day: number } {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: this.timeZone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
      weekday: 'short',
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return {
      hour: Number(values.hour) % 24,
      minute: Number(values.minute),
      day: weekdays.indexOf(values.weekday),
    };
  }

  private minutesUntil(date: Date, target: number): number {
    const { hour, minute } = this.getBusinessParts(date);
    const current = hour * 60 + minute;
    return (target - current + 1440) % 1440 || 1440;
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
    * - Si tiene franjas día/noche: la franja diurna de un día especial recibe
    *   la hora extra. La franja nocturna pertenece al día en que comienza.
   */
  private isInPeriodoEspecial(date: Date, motel: Motel): boolean {
    const diasEspeciales = Array.isArray(motel.DiasEspeciales)
      ? (motel.DiasEspeciales as number[])
      : [];
    if (diasEspeciales.length === 0 || (motel.HorasExtraEspeciales ?? 0) <= 0) return false;

    const { hour: hours, minute, day } = this.getBusinessParts(date);
    if (motel.HorarioUnico) return diasEspeciales.includes(day);

    const iniciodia = this.getHour(motel.InicioDia);
    const inicionoche = this.getHour(motel.InicioNoche);
    const inicioDiaMinutos = iniciodia * 60 + this.getMin(motel.InicioDia);
    const inicioNocheMinutos = inicionoche * 60 + this.getMin(motel.InicioNoche);
    const horaActual = hours * 60 + minute;

    const esFranjaDiurna = horaActual >= inicioDiaMinutos && horaActual < inicioNocheMinutos;
    if (esFranjaDiurna) return diasEspeciales.includes(day);

    // La franja nocturna pertenece al día en que comienza. Por eso conserva
    // la hora extra si ese día es especial, aunque el siguiente no lo sea.
    const diaEspecial = horaActual >= inicioNocheMinutos ? day : (day + 6) % 7;
    return diasEspeciales.includes(diaEspecial);
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
    const { hour: hours } = this.getBusinessParts(date);
    const iniciodia = this.getHour(motel.InicioDia);
    const inicionoche = this.getHour(motel.InicioNoche);

    // Determine if it's day or night time for duration
    let isDayTime: boolean;
    if (tipoEstancia === 'Pernocte') {
      isDayTime = false;
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
      totalMinutes = this.minutesUntil(date, checkOutH * 60 + checkOutM);
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
      const minutosExtra = Number(
        (tarifa as any).MinutosExtra ?? (tarifa as any).minutosExtra,
      );
      if (minutosExtra > 0) {
        totalMinutes += minutosExtra;
      }

      if (isDayTime && motel.AplicaCorteCheckout) {
        const checkOutH = this.getHour(motel.CheckOutDia);
        const checkOutM = this.getMin(motel.CheckOutDia);

        const minutesUntilLimit = this.minutesUntil(date, checkOutH * 60 + checkOutM);

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
    const { hour: hours } = this.getBusinessParts(salida);

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
    // Precio menor que la tarifa estándar identifica la promo diurna persistida.
    // Un Precio mayor puede ser un recálculo con excedentes y no debe ser base.
    const precioTarifa = this.toNumber(tarifa.PrecioTurno);
    const precioPersistido = this.toNumber(elturno.Precio);
    const precioBase = precioPersistido > 0 && precioPersistido < precioTarifa
      ? precioPersistido
      : precioTarifa || precioPersistido || 0;
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
      SubtotalTarifa: precioBase + extra,
      SubtotalConsumos: totalConsumos,
    };
  }
}
