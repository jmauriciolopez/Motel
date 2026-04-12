import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../compartido/bases/base.service';
import { Turno, EstadoHabitacion } from '@prisma/client';
import { CrearTurnoDto } from './dto/crear-turno.dto';
import { TenantContext } from '../../compartido/interfaces/tenant-context.interface';
import { MotorTarifarioService } from '../tarifas/motor-tarifario.service';

function motelIdRequerido(tenant: TenantContext): string {
  if (!tenant?.motelId) {
    throw new BadRequestException(
      'Indicá un motel activo (x-motel-id) para operar con turnos',
    );
  }
  return tenant.motelId;
}

/** Estado calculado — no persiste en DB */
function calcularEstado(turno: { Salida?: Date | null; PagoPendiente?: boolean | null; limpieza?: { Finalizado?: boolean } | null }): string {
  if (!turno.Salida) return 'ABIERTO';
  if (turno.PagoPendiente) return 'CERRADO';
  if (turno.limpieza) return 'LIBRE';
  return 'COBRADO';
}

/** Inyecta el estado calculado en el turno o lista de turnos */
function conEstado<T extends { Salida?: Date | null; PagoPendiente?: boolean | null; limpieza?: { Finalizado?: boolean } | null }>(turno: T): T & { Estado: string } {
  return { ...turno, Estado: calcularEstado(turno) };
}

@Injectable()
export class TurnosService extends BaseService<Turno> {
  constructor(
    prisma: PrismaService,
    private motorTarifario: MotorTarifarioService,
  ) {
    super(prisma, 'turno', { hasMotelId: true });
  }

  async abrirTurno(crearTurnoDto: CrearTurnoDto, tenant: TenantContext) {
    const motelIdActivo = motelIdRequerido(tenant);

    return this.prisma.$transaction(async (tx) => {
      const habitacion = await tx.habitacion.findFirst({
        where: {
          id: crearTurnoDto.habitacionId,
          motelId: motelIdActivo,
          deletedAt: null,
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

      const turno = await tx.turno.create({
        data: {
          habitacionId: crearTurnoDto.habitacionId,
          clienteId: crearTurnoDto.clienteId,
          tarifaId,
          usuarioAperturaId: crearTurnoDto.usuarioAperturaId,
          Ingreso: crearTurnoDto.Ingreso ? new Date(crearTurnoDto.Ingreso) : new Date(),
          Total: crearTurnoDto.Total ?? 0,
          Precio: crearTurnoDto.Precio ?? 0,
          PagoPendiente: true,
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
    });
  }

  async cerrarTurno(
    id: string,
    usuarioCierreId: string,
    tenant: TenantContext,
  ) {
    const motelIdActivo = motelIdRequerido(tenant);

    return this.prisma.$transaction(async (tx) => {
      const turno = await tx.turno.findFirst({
        where: {
          id,
          deletedAt: null,
          habitacion: { motelId: motelIdActivo },
        },
        include: {
          tarifa: true,
          consumos: true,
          habitacion: {
            include: { motel: true },
          },
        },
      });

      if (!turno) throw new NotFoundException('Turno no encontrado');
      if (turno.Salida) {
        throw new BadRequestException('El turno ya fue cerrado');
      }

      const Salida = new Date();

      const consumosCalc = turno.consumos.map((c) => {
        const imp = Number(c.Importe);
        const qty = c.Cantidad;
        return {
          productoId: c.productoId,
          cantidad: qty,
          precioUnitario: qty > 0 ? imp / qty : 0,
          importe: imp,
        };
      });

      const calculo = this.motorTarifario.calcularTurno({
        motelId: motelIdActivo,
        habitacionId: turno.habitacionId,
        tarifaId: turno.tarifaId,
        fechaInicio: turno.Ingreso,
        fechaFin: Salida,
        tarifa: turno.tarifa,
        motel: turno.habitacion.motel,
        consumos: consumosCalc,
      });

      const Total = calculo.total;

      let turnoResult = await tx.turno.update({
        where: { id },
        data: {
          Salida,
          Total,
          usuarioCierreId,
          PagoPendiente: true,
        },
      });

      await tx.habitacion.update({
        where: { id: turno.habitacionId },
        data: { Estado: EstadoHabitacion.LIMPIEZA },
      });

      return turnoResult;
    });
  }

  async obtenerTodos(options: any, extraWhere: any = {}) {
    const {
      es_reporte: _esReporte,
      mostrar_cerrados: mostrarCerrados,
      r_Salida_desde: salidaDesde,
      r_Salida_hasta: salidaHasta,
      Estado: estadoFiltro,
      ...reportFilters
    } = extraWhere || {};

    // También extraer de options (llegan como query params sueltos)
    const {
      es_reporte: _esReporteOpt,
      mostrar_cerrados: mostrarCerradosOpt,
      r_Salida_desde: salidaDesdeOpt,
      r_Salida_hasta: salidaHastaOpt,
      hora_cierre: _horaCierre,
      Estado: _estadoOpt,
      include,
      motelId,
      ...restOptions
    } = options;

    const finalMostrarCerrados = mostrarCerrados ?? mostrarCerradosOpt;
    const finalSalidaDesde = salidaDesde ?? salidaDesdeOpt;
    const finalSalidaHasta = salidaHasta ?? salidaHastaOpt;

    const where: any = {
      ...reportFilters,
    };

    if (finalMostrarCerrados !== true && finalMostrarCerrados !== 'true') {
      // Vista operativa: excluye solo los LIBRE (limpieza registrada)
      where.NOT = {
        AND: [
          { Salida: { not: null } },
          { PagoPendiente: false },
          { limpieza: { isNot: null } },
        ],
      };
    }

    // Si el front filtra por Estado calculado, traducirlo a condición real
    if (estadoFiltro) {
      if (estadoFiltro === 'ABIERTO') where.Salida = null;
      else if (estadoFiltro === 'CERRADO') { where.Salida = { not: null }; where.PagoPendiente = true; }
      else if (estadoFiltro === 'COBRADO') { where.Salida = { not: null }; where.PagoPendiente = false; }
    }

    if (finalSalidaDesde || finalSalidaHasta) {
      where.Salida = {
        ...(where.Salida || {}),
        ...(finalSalidaDesde
          ? { gte: new Date(`${finalSalidaDesde}T00:00:00.000Z`) }
          : {}),
        ...(finalSalidaHasta
          ? { lte: new Date(`${finalSalidaHasta}T23:59:59.999Z`) }
          : {}),
      };
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
          consumos: {
            include: { producto: true },
          },
          pago: {
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
      data: result.data.map(conEstado),
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
        habitacion: true,
        cliente: true,
        tarifa: true,
        consumos: {
          include: { producto: true },
        },
        pago: true,
        ...(include || {}),
      },
      extraWhere,
      scopedMotelId,
    );
    return turno ? conEstado(turno as any) : null;
  }
}
