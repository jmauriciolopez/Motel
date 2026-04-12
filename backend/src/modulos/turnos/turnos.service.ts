import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../compartido/bases/base.service';
import { Turno, EstadoHabitacion } from '@prisma/client';
import { CrearTurnoDto } from './dto/crear-turno.dto';
import { ActualizarTurnoDto } from './dto/actualizar-turno.dto';
import { CalculadoraTarifas } from '../../compartido/utilidades/calculadora-tarifas.util';
import { CajasService } from '../cajas/cajas.service';
import { TenantContext } from '../../compartido/interfaces/tenant-context.interface';

@Injectable()
export class TurnosService extends BaseService<Turno> {
  constructor(
    prisma: PrismaService,
    private cajasService: CajasService,
  ) {
    super(prisma, 'turno', { hasMotelId: true });
  }

  async abrirTurno(crearTurnoDto: CrearTurnoDto, tenant: TenantContext) {
    const motelIdActivo =
      tenant.scope === 'motel' ? tenant.motelId : null;
    if (!motelIdActivo) {
      throw new BadRequestException(
        'Indique un motel activo (x-motel-id) para abrir un turno',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const habitacion = await tx.habitacion.findFirst({
        where: {
          id: crearTurnoDto.habitacionId,
          motelId: motelIdActivo,
          deletedAt: null,
        },
      });

      if (!habitacion || habitacion.Estado !== EstadoHabitacion.DISPONIBLE) {
        throw new BadRequestException('La habitación no está disponible para abrir un turno.');
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
        throw new BadRequestException('La habitación seleccionada no tiene una tarifa asignada.');
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

      // 3. Cambiar estado de la habitación a OCUPADA
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
    const motelIdActivo =
      tenant.scope === 'motel' ? tenant.motelId : null;
    if (!motelIdActivo) {
      throw new BadRequestException(
        'Indique un motel activo (x-motel-id) para cerrar un turno',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const turno = await tx.turno.findFirst({
        where: {
          id,
          deletedAt: null,
          habitacion: { motelId: motelIdActivo },
        },
        include: {
          tarifa: true,
          habitacion: {
            include: { motel: true },
          },
        },
      });

      if (!turno) throw new NotFoundException('Turno no encontrado');
      if (turno.Estado === 'CERRADO') throw new BadRequestException('El turno ya está cerrado');

      const Salida = new Date();

      // 2. Calcular total
      const Total = CalculadoraTarifas.calcularTotal(
        turno.Ingreso,
        Salida,
        turno.tarifa,
        turno.habitacion.motel,
      );

      // 3. Actualizar turno
      const turnoActualizado = await tx.turno.update({
        where: { id },
        data: {
          Salida,
          Total,
          Estado: 'CERRADO',
          usuarioCierreId,
        },
      });

      // 4. Registrar Pago y Movimiento de Caja (Automático)
      if (Number(Total) > 0) {
        let finalFormaPagoId = formaPagoId;

        // Si no se provee formaPagoId, buscar la de tipo 'Efectivo' por defecto
        if (!finalFormaPagoId) {
          const fpEfectivo = await tx.formaPago.findFirst({
            where: { Tipo: { contains: 'efectivo', mode: 'insensitive' } }
          });
          finalFormaPagoId = fpEfectivo?.id;
        }

        if (finalFormaPagoId) {
          // Crear el Pago
          await tx.pago.create({
            data: {
              Importe: Total,
              turnoId: id,
              formaPagoId: finalFormaPagoId,
              motelId: turno.habitacion.motelId,
            }
          });

          // Registrar en Caja
          const ultimoMovimiento = await tx.caja.findFirst({
            where: { motelId: turno.habitacion.motelId, deletedAt: null },
            orderBy: { createdAt: 'desc' },
          });

          const saldoAnterior = ultimoMovimiento ? Number(ultimoMovimiento.Saldo) : 0;
          const nuevoSaldo = saldoAnterior + Number(Total);

          await tx.caja.create({
            data: {
              Concepto: `Pago Turno Hab. ${turno.habitacion.Identificador}`,
              Importe: Total,
              Saldo: nuevoSaldo,
              motelId: turno.habitacion.motelId,
            }
          });
        }
      }

      // 5. Pasar habitación a LIMPIEZA
      await tx.habitacion.update({
        where: { id: turno.habitacionId },
        data: { Estado: EstadoHabitacion.LIMPIEZA },
      });

      return turnoActualizado;
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
        ...(salidaDesde ? { gte: new Date(`${salidaDesde}T00:00:00.000Z`) } : {}),
        ...(salidaHasta ? { lte: new Date(`${salidaHasta}T23:59:59.999Z`) } : {}),
      };
    }

    const { include, motelId, ...restOptions } = options;

    // Turno no tiene motelId directo — filtrar via habitacion
    if (motelId) {
      where.habitacion = { ...(where.habitacion || {}), motelId };
    }

    return super.obtenerTodos({
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
      // Si no hay sort, por defecto Ingreso desc
      orderBy: options.sort ? undefined : { Ingreso: 'desc' },
    }, where);
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
