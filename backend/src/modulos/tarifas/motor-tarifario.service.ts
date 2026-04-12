import { Injectable } from '@nestjs/common';
import { CalculadoraTarifas } from '../../compartido/utilidades/calculadora-tarifas.util';
import type { CalcularTurnoInput, CalcularTurnoOutput } from './motor-tarifario.types';

/**
 * Motor tarifario V2: centraliza el cálculo de turno (tarifa + consumos).
 * La lógica base de franjas/tolerancia sigue en CalculadoraTarifas hasta migrar reglas a BD.
 */
@Injectable()
export class MotorTarifarioService {
  calcularTurno(input: CalcularTurnoInput): CalcularTurnoOutput {
    const subtotalTarifa = CalculadoraTarifas.calcularTotal(
      input.fechaInicio,
      input.fechaFin,
      input.tarifa,
      input.motel,
    );

    const subtotalConsumos = input.consumos.reduce(
      (acc, c) => acc + Number(c.importe),
      0,
    );

    const ms = input.fechaFin.getTime() - input.fechaInicio.getTime();
    const duracionMinutos = Math.max(0, Math.round(ms / 60_000));

    const total = subtotalTarifa + subtotalConsumos;

    return {
      tarifaAplicadaId: input.tarifaId ?? input.tarifa.id,
      duracionMinutos,
      duracionBaseMinutos: 0,
      duracionGraciaMinutos: 0,
      duracionExcedenteMinutos: 0,
      subtotalTarifa,
      subtotalConsumos,
      recargos: 0,
      descuentos: 0,
      total,
      detalle: {
        precioBase: subtotalTarifa,
        bloquesExcedente: 0,
        valorBloqueExcedente: 0,
        recargoSobreestadia: 0,
        promoAplicada: null,
      },
    };
  }
}
