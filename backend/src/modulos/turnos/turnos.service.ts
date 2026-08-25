import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../compartido/bases/base.service';
import { Turno, EstadoHabitacion } from '@prisma/client';
import { CrearTurnoDto } from './dto/crear-turno.dto';
import { TenantContext } from '../../compartido/interfaces/tenant-context.interface';
import { MotorTarifarioService } from '../tarifas/motor-tarifario.service';
import { extraerMontoDescuentoDeObservacion, TurnoCalculator } from '../tarifas/turno-calculator';

function motelIdRequerido(tenant: TenantContext): string {
  if (!tenant?.motelId) {
    throw new BadRequestException(
      'Indicá un motel activo (x-motel-id) para operar con turnos',
    );
  }
  return tenant.motelId;
}

/** Devuelve true si aún hay saldo por cobrar */
function sincronizarPagoPendiente(saldo: number): boolean {
  return saldo > 0;
}

/** Estado calculado — no persiste en DB.
 *  ABIERTO  : sin Salida (puede tener pagos parciales anticipados)
 *  CERRADO  : con Salida y SaldoPendiente > 0
 *  COBRADO  : con Salida y SaldoPendiente === 0
 */
function calcularEstado(turno: {
  Salida?: Date | null;
  SaldoPendiente?: any;
  PagoPendiente?: boolean | null;
  limpieza?: { Finalizado?: boolean } | null;
}): string {
  if (!turno.Salida) return 'ABIERTO';
  const saldo = Number(turno.SaldoPendiente ?? 0);
  if (saldo > 0) return 'CERRADO';
  return 'COBRADO';
}

/** Inyecta el estado calculado en el turno */
function conEstado<T extends {
  Salida?: Date | null;
  SaldoPendiente?: any;
  PagoPendiente?: boolean | null;
  limpieza?: { Finalizado?: boolean } | null;
}>(turno: T): T & { Estado: string } {
  return { ...turno, Estado: calcularEstado(turno) };
}

@Injectable()
export class TurnosService extends BaseService<Turno> {
  constructor(
    prisma: PrismaService,
    private motorTarifario: MotorTarifarioService,
    private turnoCalculator: TurnoCalculator,
  ) {
    super(prisma, 'turno', { hasMotelId: false });
  }

  async abrirTurno(crearTurnoDto: CrearTurnoDto, tenant: TenantContext) {
    const motelIdActivo = motelIdRequerido(tenant);

    return this.prisma.$transaction(
      async (tx) => {
        const habitacion = await tx.habitacion.findFirst({
          where: {
            id: crearTurnoDto.habitacionId,
            motelId: motelIdActivo,
            deletedAt: null,
          },
          include: {
            motel: true,
          },
        });

      if (!habitacion || habitacion.Estado !== EstadoHabitacion.DISPONIBLE) {
        throw new BadRequestException(
          'La habitación no está disponible para abrir un turno.',
        );
      }

      const cliente = await tx.cliente.findFirst({
        where: {
          id: crearTurnoDto.clienteId,
          motelId: motelIdActivo,
          deletedAt: null,
        },
      });
      if (!cliente) {
        throw new BadRequestException('El cliente no pertenece al motel activo');
      }

      const tarifaId = crearTurnoDto.tarifaId || habitacion.tarifaId;
      if (!tarifaId) {
        throw new BadRequestException(
          'La habitación seleccionada no tiene una tarifa asignada.',
        );
      }

      const tarifa = await tx.tarifa.findFirst({
        where: { id: tarifaId, motelId: motelIdActivo, deletedAt: null },
      });
      if (!tarifa) {
        throw new BadRequestException('La tarifa no pertenece al motel activo');
      }

      // Calculate initial values using TurnoCalculator
      const initialValues = this.turnoCalculator.calculateInitialValues(
        { motel: habitacion.motel as any, tarifa: tarifa as any },
        crearTurnoDto.Ingreso,
        crearTurnoDto.TipoEstadia,
      );

      const turno = await tx.turno.create({
        data: {
          habitacionId: crearTurnoDto.habitacionId,
          clienteId: crearTurnoDto.clienteId,
          tarifaId,
          usuarioAperturaId: crearTurnoDto.usuarioAperturaId,
          Ingreso: crearTurnoDto.Ingreso ? new Date(crearTurnoDto.Ingreso) : new Date(),
          Total: initialValues.Total,
          Precio: initialValues.Precio,
          Minutos: initialValues.Minutos,
          SaldoPendiente: initialValues.Precio,   // saldo inicial = precio base del turno
          PagoPendiente: true,                     // derivado: SaldoPendiente > 0
          TipoEstadia: crearTurnoDto.TipoEstadia,
          Observacion: crearTurnoDto.Observacion,
          ObservacionSecundaria: crearTurnoDto.ObservacionSecundaria,
        } as any,
      });

      await tx.habitacion.update({
        where: { id: crearTurnoDto.habitacionId },
        data: { Estado: EstadoHabitacion.OCUPADA },
      });

      return turno;
    },
    { timeout: 10000 },
  );
  }

  async cerrarTurno(
    id: string,
    usuarioCierreId: string,
    tenant: TenantContext,
  ) {
    const motelIdActivo = motelIdRequerido(tenant);

    return this.prisma.$transaction(
      async (tx) => {
        const turno = await tx.turno.findFirst({
          where: {
            id,
            deletedAt: null,
            habitacion: { motelId: motelIdActivo },
          },
          include: {
            tarifa: true,
            consumos: true,
            pagos: true,
            habitacion: {
              include: { motel: true, tarifa: true },
            },
          },
        });

      if (!turno) throw new NotFoundException('Turno no encontrado');
      if (turno.Salida) {
        throw new BadRequestException('El turno ya fue cerrado');
      }

      const tarifa = turno.tarifa || turno.habitacion?.tarifa;

      // Calculate closing values using TurnoCalculator
      const closingValues = this.turnoCalculator.calculateClosingValues(
        turno as any,
        { motel: turno.habitacion.motel as any, tarifa: tarifa as any },
      );

      const totalPagado = (turno.pagos || []).reduce(
        (sum: number, p: any) => sum + Number(p.Importe),
        0,
      );

      const nuevoSaldo = Math.max(0, closingValues.Total - totalPagado);

      let turnoResult = await tx.turno.update({
        where: { id },
        data: {
          Salida: closingValues.Salida,
          Total: closingValues.Total,
          Precio: closingValues.PrecioCalculo,
          SaldoPendiente: nuevoSaldo,
          PagoPendiente: sincronizarPagoPendiente(nuevoSaldo),
          usuarioCierreId,
        },
      });

      await tx.habitacion.update({
        where: { id: turno.habitacionId },
        data: { Estado: EstadoHabitacion.LIMPIEZA },
      });

      return turnoResult;
    },
    { timeout: 10000 },
  );
  }

  /** Inyecta el estado calculado y ajusta dynamic Total/SaldoPendiente para turnos abiertos con excedente */
  private calcularTurnoConExcedente(turno: any): any {
    if (!turno) return turno;

    let total = Number(turno.Total ?? 0);
    let saldoPendiente = Number(turno.SaldoPendiente ?? 0);
    let pagoPendiente = Boolean(turno.PagoPendiente);

    const descuentoObs = extraerMontoDescuentoDeObservacion(turno.Observacion);
    const totalPagadoPersistido = (turno.pagos || []).reduce(
      (sum: number, p: any) => sum + Number(p.Importe || 0),
      0,
    );
    // Cierre que recalculó el bruto y dejó el descuento como "saldo"
    if (
      turno.Salida &&
      descuentoObs > 0 &&
      Math.abs(saldoPendiente - descuentoObs) < 0.05 &&
      Math.abs(totalPagadoPersistido + saldoPendiente - total) < 0.05
    ) {
      total = Math.max(0, total - descuentoObs);
      saldoPendiente = 0;
      pagoPendiente = false;
    }

    if (!turno.Salida && (turno.habitacion?.motel) && (turno.tarifa || turno.habitacion?.tarifa)) {
      const motel = turno.habitacion.motel;
      const tarifa = turno.tarifa || turno.habitacion.tarifa;

      try {
        const closingValues = this.turnoCalculator.calculateClosingValues(
          turno as any,
          { motel: motel as any, tarifa: tarifa as any },
        );

        total = closingValues.Total;
        const totalPagado = (turno.pagos || []).reduce(
          (sum: number, p: any) => sum + Number(p.Importe),
          0,
        );
        saldoPendiente = Math.max(0, total - totalPagado);
        pagoPendiente = sincronizarPagoPendiente(saldoPendiente);
      } catch (err) {
        // Fallback a valores persistidos si falla el cálculo
      }
    }

    const estado = !turno.Salida ? 'ABIERTO' : saldoPendiente > 0 ? 'CERRADO' : 'COBRADO';

    return {
      ...turno,
      Total: total,
      SaldoPendiente: saldoPendiente,
      PagoPendiente: pagoPendiente,
      Estado: estado,
    };
  }

  async obtenerTodos(options: any, extraWhere: any = {}) {
    const {
      es_reporte: _esReporte,
      mostrar_cerrados: mostrarCerrados,
      r_Salida_desde: _r_salidaDesde, // Ignorar legacy
      r_Salida_hasta: _r_salidaHasta, // Ignorar legacy
      Salida_desde: salidaDesde,
      Salida_hasta: salidaHasta,
      Estado: estadoFiltro,
      hora_cierre: _horaCierreExtra,
      ...reportFilters
    } = extraWhere || {};

    // También extraer de options (llegan como query params sueltos)
    const {
      es_reporte: _esReporteOpt,
      mostrar_cerrados: mostrarCerradosOpt,
      Salida_desde: salidaDesdeOpt,
      Salida_hasta: salidaHastaOpt,
      hora_cierre: _horaCierre,
      Estado: _estadoOpt,
      include,
      motelId,
      ...restOptions
    } = options;

    const finalMostrarCerrados = mostrarCerrados ?? mostrarCerradosOpt;
    const finalSalidaDesde = salidaDesde ?? salidaDesdeOpt;
    const finalSalidaHasta = salidaHasta ?? salidaHastaOpt;

    // Extraer también r_Salida_desde/hasta de reportFilters para evitar conflictos
    const {
      Salida_desde: _salidaDesdeReport,
      Salida_hasta: _salidaHastaReport,
      ...cleanReportFilters
    } = reportFilters;

    const where: any = {
      ...cleanReportFilters,
    };

    if (finalMostrarCerrados !== true && finalMostrarCerrados !== 'true') {
      // Vista operativa: excluye los COBRADOS con limpieza registrada
      where.NOT = {
        AND: [
          { Salida: { not: null } },
          { SaldoPendiente: 0 },
          { limpieza: { isNot: null } },
        ],
      };
    }

    // Si el front filtra por Estado calculado, traducirlo a condición real
    if (estadoFiltro) {
      if (estadoFiltro === 'ABIERTO') {
        where.Salida = null;
      } else if (estadoFiltro === 'CERRADO') {
        where.Salida = { not: null };
        where.SaldoPendiente = { gt: 0 };
      } else if (estadoFiltro === 'COBRADO') {
        where.Salida = { not: null };
        where.SaldoPendiente = 0;
      }
    }

    if (finalSalidaDesde || finalSalidaHasta) {
      const dateFilter: any = {};
      if (finalSalidaDesde) {
        dateFilter.gte = new Date(`${finalSalidaDesde}T00:00:00.000Z`);
      }
      if (finalSalidaHasta) {
        dateFilter.lte = new Date(`${finalSalidaHasta}T23:59:59.999Z`);
      }

      // Merge with existing Salida filter if present
      if (where.Salida && typeof where.Salida === 'object') {
        where.Salida = { ...where.Salida, ...dateFilter };
      } else {
        where.Salida = dateFilter;
      }
    }

    if (motelId) {
      where.habitacion = { ...(where.habitacion || {}), motelId };
    }

    return super.obtenerTodos(
      {
        ...restOptions,
        include: {
          habitacion: {
            include: {
              tarifa: true,
              motel: true,
            },
          },
          cliente: true,
          tarifa: true,
          usuarioApertura: true,
          usuarioCierre: true,
          consumos: {
            include: { producto: true },
          },
          pagos: {
            include: { formaPago: true },
          },
          limpieza: true,
          ...(include || {}),
        },
        orderBy: options.sort ? undefined : { Ingreso: 'desc' },
      },
      where,
    ).then(result => ({
      ...result,
      data: result.data.map(t => this.calcularTurnoConExcedente(t)),
    }));
  }

  async obtenerUno(
    id: string,
    include?: any,
    extraWhere: any = {},
    scopedMotelId?: string | null,
  ) {
    const turno = await super.obtenerUno(
      id,
      {
        habitacion: {
          include: {
            tarifa: true,
            motel: true,
          },
        },
        cliente: true,
        tarifa: true,
        consumos: {
          include: { producto: true },
        },
        pagos: true,
        ...(include || {}),
      },
      extraWhere,
      scopedMotelId,
    );
    return turno ? this.calcularTurnoConExcedente(turno as any) : null;
  }

  async obtenerTurnosCompletados(params: {
    fechaDesde: string;
    fechaHasta: string;
    horaCierre: string;
    page: number;
    limit: number;
    motelId?: string | null;
  }) {
    const { fechaDesde, fechaHasta, horaCierre, page, limit, motelId } = params;

    // Construir fechas con hora de cierre contable
    // Formato: "2026-04-11" + "T" + "06:00" + ":00.000Z"
    const salidaDesde = new Date(`${fechaDesde}T${horaCierre}:00.000Z`);
    const salidaHasta = new Date(`${fechaHasta}T${horaCierre}:00.000Z`);
    salidaHasta.setDate(salidaHasta.getDate() + 1);

    const where: any = {
      Salida: {
        gte: salidaDesde,
        lt: salidaHasta,
      },
    };

    if (motelId) {
      where.habitacion = { motelId };
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.model.findMany({
        where,
        skip,
        take: limit,
        orderBy: { Salida: 'desc' },
        include: {
          habitacion: {
            include: {
              tarifa: true,
              motel: true,
            },
          },
          cliente: true,
          tarifa: true,
          usuarioApertura: true,
          usuarioCierre: true,
          consumos: {
            include: { producto: true },
          },
          pagos: {
            include: { formaPago: true },
          },
          limpieza: true,
        },
      }),
      this.model.count({ where }),
    ]);

    return {
      data: data.map(conEstado),
      total,
    };
  }
}
