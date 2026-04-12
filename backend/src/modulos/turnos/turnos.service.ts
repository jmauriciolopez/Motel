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
          ...crearTurnoDto,
          tarifaId,
          Estado: crearTurnoDto.Estado || 'ABIERTO',
          Ingreso: crearTurnoDto.Ingreso ? new Date(crearTurnoDto.Ingreso) : new Date(),
          Total: crearTurnoDto.Total ?? 0,
        },
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
    formaPagoId: string | undefined,
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
      if (turno.Estado === 'CERRADO' || turno.Estado === 'COBRADO') {
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
          Estado: 'CERRADO',
          usuarioCierreId,
          PagoPendiente: Number(Total) > 0,
        },
      });

      if (Number(Total) > 0) {
        let finalFormaPagoId = formaPagoId;

        if (!finalFormaPagoId) {
          const fpEfectivo = await tx.formaPago.findFirst({
            where: { Tipo: { contains: 'efectivo', mode: 'insensitive' } },
          });
          finalFormaPagoId = fpEfectivo?.id;
        }

        if (!finalFormaPagoId) {
          throw new BadRequestException(
            'Definí una forma de pago o configurá una forma de pago en efectivo por defecto',
          );
        }

        await tx.pago.create({
          data: {
            Importe: Total,
            turnoId: id,
            formaPagoId: finalFormaPagoId,
            motelId: turno.habitacion.motelId,
          },
        });

        const ultimoMovimiento = await tx.caja.findFirst({
          where: { motelId: turno.habitacion.motelId, deletedAt: null },
          orderBy: { createdAt: 'desc' },
        });

        const saldoAnterior = ultimoMovimiento
          ? Number(ultimoMovimiento.Saldo)
          : 0;
        const nuevoSaldo = saldoAnterior + Number(Total);

        await tx.caja.create({
          data: {
            Concepto: `Cobro turno hab. ${turno.habitacion.Identificador}`,
            Importe: Total,
            Saldo: nuevoSaldo,
            motelId: turno.habitacion.motelId,
          },
        });

        turnoResult = await tx.turno.update({
          where: { id },
          data: { PagoPendiente: false },
        });
      }

      await tx.habitacion.update({
        where: { id: turno.habitacionId },
        data: { Estado: EstadoHabitacion.LIMPIEZA },
      });

      await tx.limpieza.upsert({
        where: { turnoId: turno.id },
        create: {
          turnoId: turno.id,
          habitacionId: turno.habitacionId,
          usuarioId: usuarioCierreId,
          motelId: turno.habitacion.motelId,
          Cuando: new Date(),
          Finalizado: false,
        },
        update: {},
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
      ...reportFilters
    } = extraWhere || {};

    const where: any = {
      ...reportFilters,
    };

    if (mostrarCerrados !== true && mostrarCerrados !== 'true') {
      where.Estado = where.Estado || 'ABIERTO';
    }

    if (salidaDesde || salidaHasta) {
      where.Salida = {
        ...(where.Salida || {}),
        ...(salidaDesde
          ? { gte: new Date(`${salidaDesde}T00:00:00.000Z`) }
          : {}),
        ...(salidaHasta
          ? { lte: new Date(`${salidaHasta}T23:59:59.999Z`) }
          : {}),
      };
    }

    const { include, motelId, ...restOptions } = options;

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
          ...(include || {}),
        },
        orderBy: options.sort ? undefined : { Ingreso: 'desc' },
      },
      where,
    );
  }

  async obtenerUno(
    id: string,
    include?: any,
    extraWhere: any = {},
    scopedMotelId?: string | null,
  ) {
    return super.obtenerUno(
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
  }
}
