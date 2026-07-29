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
  PrecioCalculo?: number;
  Total: number;
}

export interface ClosingValues {
  Salida: Date;
  PrecioCalculo: number;
  Total: number;
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
  private toNumber(value: number | Decimal | null | undefined): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    return value.toNumber();
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
    const iniciodia = this.getHour(motel.InicioDia);
    const inicionoche = this.getHour(motel.InicioNoche);

    // Día "efectivo": la madrugada (antes de InicioDia) pertenece al día anterior
    let diaEfectivo = date.getDay();
     if (!diasEspeciales.includes(diaEfectivo)) return false;

    if (hours >= iniciodia && hours <= inicionoche) {
      return true;
    }
   
  return true;
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

    const iniciodia = this.getHour(motel.InicioDia);
    const inicionoche = this.getHour(motel.InicioNoche);

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

      if (isDayTime) {
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
    const turnoMinutos = elturno.Minutos || 0;
    const demora = minutosPermanencia - turnoMinutos;
    const tolerancia = motel.Tolerancia || 0;
    const maxdemora = (motel.MaxHrAdicional || 0) * 60;

    let extra = 0;
    let newPrecioCalculo = elturno.PrecioCalculo || this.toNumber(tarifa.PrecioTurno);
    let newTotal = this.toNumber(elturno.Total);

    // Only charge extra if delay exceeds tolerance
    if (demora > tolerancia) {
      if (maxdemora > 0 && demora > maxdemora) {
        // Exceeds maximum additional hours allowed -> Switch to Daily/Full price
        newPrecioCalculo = this.toNumber(tarifa.PrecioDiario) || this.toNumber(tarifa.PrecioTurno);
        newTotal = newTotal - (elturno.PrecioCalculo || 0) + newPrecioCalculo;
      } else {
        // Charge per Full Hour (Any fraction of hour counts as full hour)
        const hourlyRate = isDayTime
          ? this.toNumber(tarifa.PrecioHrDiaExcede)
          : (this.toNumber(tarifa.PrecioHrNocheExcede) || this.toNumber(tarifa.PrecioHrDiaExcede));

        const cantHorasExtra = Math.ceil(demora / 60);
        extra = hourlyRate * cantHorasExtra;

        newPrecioCalculo = newPrecioCalculo + extra;
        newTotal = newTotal + extra;
      }
    }

    return {
      Salida: salida,
      PrecioCalculo: newPrecioCalculo,
      Total: newTotal,
    };
  }
}
