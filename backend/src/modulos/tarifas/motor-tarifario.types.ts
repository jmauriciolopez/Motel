import type { Motel, Tarifa } from '@prisma/client';

export type ConsumoParaCalculo = {
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  importe: number;
};

export type CalcularTurnoInput = {
  motelId: string;
  habitacionId: string;
  tarifaId: string | null;
  fechaInicio: Date;
  fechaFin: Date;
  tarifa: Tarifa;
  motel: Motel;
  consumos: ConsumoParaCalculo[];
};

export type CalcularTurnoOutput = {
  tarifaAplicadaId: string;
  duracionMinutos: number;
  duracionBaseMinutos: number;
  duracionGraciaMinutos: number;
  duracionExcedenteMinutos: number;
  subtotalTarifa: number;
  subtotalConsumos: number;
  recargos: number;
  descuentos: number;
  total: number;
  detalle: {
    precioBase: number;
    bloquesExcedente: number;
    valorBloqueExcedente: number;
    recargoSobreestadia: number;
    promoAplicada: string | null;
  };
};
