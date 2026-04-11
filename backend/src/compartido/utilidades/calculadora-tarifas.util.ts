import { Tarifa, Motel } from '@prisma/client';

export class CalculadoraTarifas {
  /**
   * Calcula el total de un turno basado en los tiempos y la configuración
   */
  static calcularTotal(
    fechaIngreso: Date,
    fechaEgreso: Date,
    tarifa: Tarifa,
    motel: Motel,
  ): number {
    const msPorHora = 1000 * 60 * 60;
    const duracionMs = fechaEgreso.getTime() - fechaIngreso.getTime();
    const duracionHoras = duracionMs / msPorHora;

    // 1. Determinar si es Turno Diario o Nocturno
    // (Simplificación para esta etapa: comparamos con el inicio del día del motel)
    const horaIngreso = fechaIngreso.getHours();
    const esNocturno = horaIngreso >= 20 || horaIngreso < 8; // Ejemplo base si no hay config

    let duracionBase = esNocturno ? motel.DuracionNocturna : motel.DuracionDiaria;
    let precioBase = Number(tarifa.PrecioTurno);
    let precioExcedente = Number(esNocturno ? tarifa.PrecioHrNocheExcede : tarifa.PrecioHrDiaExcede);

    // 2. Aplicar Tolerancia (conversión a horas)
    const toleranciaHoras = motel.Tolerancia / 60;

    // 3. Calcular Excedente
    let total = precioBase;

    if (duracionHoras > (duracionBase + toleranciaHoras)) {
      const horasExtra = Math.ceil(duracionHoras - duracionBase);
      total += horasExtra * precioExcedente;
    }

    return total;
  }
}
