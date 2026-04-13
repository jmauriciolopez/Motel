import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../compartido/bases/base.service';
import { Producto } from '@prisma/client';
import { CrearProductoDto } from './dto/crear-producto.dto';

@Injectable()
export class ProductosService extends BaseService<Producto> {
  constructor(prisma: PrismaService) {
    super(prisma, 'producto', { hasMotelId: true });
  }

  async crear(crearProductoDto: CrearProductoDto) {
    return this.prisma.producto.create({
      data: crearProductoDto,
      include: {
        rubro: true,
        catalogoProducto: true,
      },
    });
  }

  async obtenerTodos(options: any, extraWhere: any = {}) {
    const { include, ...rest } = options;
    return super.obtenerTodos(
      {
      ...rest,
      include: {
        rubro: true,
        catalogoProducto: true,
        ...(include || {}),
      },
      },
      extraWhere,
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
        rubro: true,
        catalogoProducto: true,
        motel: true,
        ...(include || {}),
      },
      extraWhere,
      scopedMotelId,
    );
  }

  async conStockSecundario(motelId?: string, facturable?: boolean) {
    if (!motelId) return { data: [], total: 0 };
    const data = await this.prisma.producto.findMany({
      where: {
        motelId,
        deletedAt: null,
        ...(facturable !== undefined ? { Facturable: facturable } : {}),
        stocks: {
          some: {
            deletedAt: null,
            Cantidad: { gt: 0 },
            deposito: { EsPrincipal: false },
          },
        },
      },
      include: { rubro: true, catalogoProducto: true },
      orderBy: { Nombre: 'asc' },
    });
    return { data, total: data.length };
  }

  async conStockPrimario(motelId?: string) {
    if (!motelId) return { data: [], total: 0 };
    const data = await this.prisma.producto.findMany({
      where: {
        motelId,
        deletedAt: null,
        stocks: {
          some: {
            deletedAt: null,
            Cantidad: { gt: 0 },
            deposito: { EsPrincipal: true },
          },
        },
      },
      include: { rubro: true, catalogoProducto: true },
      orderBy: { Nombre: 'asc' },
    });
    return { data, total: data.length };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SYNC CATÁLOGO
  // ────────────────────────────────────────────────────────────────────────────
  async syncCatalogo(motelId: string, catalogoIds: string[]) {
    // Verificar que el motel existe
    const motelExiste = await this.prisma.motel.findUnique({ where: { id: motelId } });
    if (!motelExiste) {
      throw new Error(`Motel no encontrado: ${motelId}`);
    }

    const catalogoItems = await this.prisma.catalogoProducto.findMany({
      where: { id: { in: catalogoIds } },
      include: { rubro: true },
    });

    if (catalogoItems.length === 0) {
      throw new Error('No se encontraron productos en el catálogo con los IDs proporcionados');
    }

    const createdProducts: Producto[] = [];
    const errors: string[] = [];

    for (const item of catalogoItems) {
      try {
        // Verificar si ya existe un producto con el mismo nombre en este motel para evitar duplicados
        const existe = await this.prisma.producto.findFirst({
          where: { Nombre: item.Nombre, motelId, deletedAt: null },
        });

        if (existe) {
          console.log(`[syncCatalogo] Producto ya existe: ${item.Nombre} en motel ${motelId}`);
          continue;
        }

        // Verificar que el rubro existe
        const rubroExiste = await this.prisma.rubro.findUnique({ where: { id: item.rubroId } });
        if (!rubroExiste) {
          const errorMsg = `Rubro no encontrado: ${item.rubroId} (${item.rubro?.Nombre || 'desconocido'}) para producto ${item.Nombre}`;
          console.error(`[syncCatalogo] ${errorMsg}`);
          errors.push(errorMsg);
          continue;
        }

        const nuevoProducto = await this.prisma.producto.create({
          data: {
            Nombre: item.Nombre,
            Precio: item.Precio,
            Costo: item.Costo,
            Facturable: item.Facturable,
            StockMinimo: item.StockMinimo,
            EsComun: true,
            CriterioBusqueda: item.CriterioBusqueda,
            rubroId: item.rubroId,
            motelId,
            catalogoProductoId: item.id,
          },
        });
        createdProducts.push(nuevoProducto);
      } catch (error) {
        const errorMsg = `Error al crear producto ${item.Nombre}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`[syncCatalogo] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    if (errors.length > 0 && createdProducts.length === 0) {
      throw new Error(`No se pudo sincronizar ningún producto. Errores: ${errors.join('; ')}`);
    }

    return {
      success: true,
      created: createdProducts.length,
      errors: errors.length > 0 ? errors : undefined,
      products: createdProducts,
    };
  }


  // ────────────────────────────────────────────────────────────────────────────
  // AJUSTE DE PRECIOS
  // ────────────────────────────────────────────────────────────────────────────
  async ajustePrecios(params: {
    motelId?: string;
    campo: string;
    porcentaje: number;
    redondeo: number;
    filtroRubroId?: string;
    filtroFacturable?: boolean;
  }) {
    const { motelId, campo, porcentaje, redondeo, filtroRubroId, filtroFacturable } = params;
    if (!motelId) throw new Error('motelId requerido');

    const where: any = { motelId, deletedAt: null };
    if (filtroRubroId) where.rubroId = filtroRubroId;
    if (filtroFacturable !== undefined && filtroFacturable !== null) {
      where.Facturable = filtroFacturable;
    }

    const productos = await this.prisma.producto.findMany({ where });

    const factor = 1 + porcentaje / 100;
    const round = (val: number | null) =>
      val != null ? Math.round((Number(val) * factor) / redondeo) * redondeo : val;

    let actualizados = 0;
    for (const p of productos) {
      const data: any = {};
      if (campo === 'Precio' || campo === 'ambos') data.Precio = round(Number(p.Precio));
      if (campo === 'Costo'  || campo === 'ambos') data.Costo  = round(Number(p.Costo));
      if (Object.keys(data).length) {
        await this.prisma.producto.update({ where: { id: p.id }, data });
        actualizados++;
      }
    }

    return { message: `${actualizados} productos actualizados`, actualizados };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // AUDITORÍA DE STOCK
  // ────────────────────────────────────────────────────────────────────────────
  async auditoriaStock(desde?: string, hasta?: string, motelId?: string) {
    if (!motelId) return { data: [], depositos: {} };

    const fechaRange =
      desde || hasta
        ? {
            ...(desde ? { gte: new Date(`${desde}T00:00:00.000Z`) } : {}),
            ...(hasta ? { lte: new Date(`${hasta}T23:59:59.999Z`) } : {}),
          }
        : undefined;

    // ── Queries en paralelo ──────────────────────────────────────────────────
    const [productos, depositosSecundarios, compraDetalles, transferenciaDetalles, insumoDetalles, consumos] =
      await Promise.all([
        // Productos con su stock agrupado por depósito
      this.prisma.producto.findMany({
        where: { motelId, deletedAt: null },
          select: {
            id: true,
            Nombre: true,
            Precio: true,
            rubro: { select: { Nombre: true } },
          stocks: {
            where: { deletedAt: null },
              select: {
                Cantidad: true,
                deposito: { select: { id: true, Nombre: true, EsPrincipal: true } },
              },
          },
        },
      }),

        // Depósitos secundarios del motel (para la columna "depositos" de la respuesta)
      this.prisma.deposito.findMany({
        where: { motelId, deletedAt: null, EsPrincipal: false },
          select: { id: true, Nombre: true },
        orderBy: { Nombre: 'asc' },
      }),

        // Compras: entrada al depósito PRINCIPAL
      this.prisma.compraDetalle.findMany({
        where: {
          motelId,
          deletedAt: null,
          compra: {
            deletedAt: null,
            ...(fechaRange ? { Fecha: fechaRange } : {}),
          },
        },
          select: { productoId: true, Cantidad: true },
      }),

        // Transferencias: salida del principal → entrada al secundario
      this.prisma.transferenciaDetalle.findMany({
        where: {
          motelId,
          deletedAt: null,
          transferencia: {
            deletedAt: null,
            ...(fechaRange ? { Fecha: fechaRange } : {}),
            depositoOrigen: { EsPrincipal: true },
            depositoDestino: { EsPrincipal: false },
          },
        },
          select: { productoId: true, Cantidad: true },
      }),

        // Insumos: egreso del depósito secundario (uso interno)
      this.prisma.insumoDetalle.findMany({
        where: {
          motelId,
          deletedAt: null,
          insumo: {
            deletedAt: null,
            ...(fechaRange ? { Fecha: fechaRange } : {}),
            deposito: { EsPrincipal: false },
          },
        },
          select: { productoId: true, Cantidad: true },
        }),

        // Consumos de turnos: egreso del depósito secundario (ventas)
        this.prisma.consumo.findMany({
          where: {
            motelId,
            deletedAt: null,
            turno: {
              ...(fechaRange ? { Ingreso: fechaRange } : {}),
            },
          },
          select: { productoId: true, Cantidad: true },
      }),
    ]);

    // ── Mapas de movimientos ─────────────────────────────────────────────────
    const compradoMap = new Map<string, number>();
    for (const d of compraDetalles) {
      compradoMap.set(d.productoId, (compradoMap.get(d.productoId) ?? 0) + (d.Cantidad ?? 0));
    }

    const transferidoMap = new Map<string, number>();
    for (const d of transferenciaDetalles) {
      transferidoMap.set(d.productoId, (transferidoMap.get(d.productoId) ?? 0) + (d.Cantidad ?? 0));
    }

    // Egresado = insumos + consumos de turnos
    const egresadoMap = new Map<string, number>();
    for (const d of insumoDetalles) {
      egresadoMap.set(d.productoId, (egresadoMap.get(d.productoId) ?? 0) + (d.Cantidad ?? 0));
    }
    for (const c of consumos) {
      egresadoMap.set(c.productoId, (egresadoMap.get(c.productoId) ?? 0) + (c.Cantidad ?? 0));
    }

    // ── Mapa de depósitos secundarios para la respuesta ──────────────────────
    const depositosMap: Record<string, string> = {};
    for (const d of depositosSecundarios) {
      depositosMap[d.id] = d.Nombre;
    }

    // ── Calcular faltantes por producto ─────────────────────────────────────
    const data = productos
      .map((p) => {
        // Stock agrupado por depósito
        let stockPrincipal = 0;
        const stockPorDeposito: Record<string, number> = {};

        for (const s of p.stocks) {
          if (s.deposito.EsPrincipal) {
            stockPrincipal += s.Cantidad ?? 0;
          } else {
            stockPorDeposito[s.deposito.id] =
              (stockPorDeposito[s.deposito.id] ?? 0) + (s.Cantidad ?? 0);
          }
        }

        const stockSecundario = Object.values(stockPorDeposito).reduce((a, b) => a + b, 0);

        const comprado    = compradoMap.get(p.id)    ?? 0;
        const transferido = transferidoMap.get(p.id) ?? 0;
        const egresado    = egresadoMap.get(p.id)    ?? 0;

        // Dep. principal: debería haber = comprado - transferido
        const esperadoPrincipal  = comprado - transferido;
        const faltantePrincipal  = esperadoPrincipal - stockPrincipal;

        // Dep. secundario: debería haber = transferido - egresado
        const esperadoSecundario = transferido - egresado;
        const faltanteSecundario = esperadoSecundario - stockSecundario;

        const Faltante = faltantePrincipal + faltanteSecundario;

      return {
        id: p.id,
        Nombre: p.Nombre,
          Rubro: p.rubro?.Nombre ?? '-',
          StockPrincipal: stockPrincipal,
          StockPorDeposito: stockPorDeposito,
          Comprado: comprado,
          Transferido: transferido,
          Egresado: egresado,
        Faltante,
          FaltanteImporte: Faltante * Number(p.Precio ?? 0),
      };
      })
      .filter((r) => r.Faltante !== 0)
      .sort((a, b) => a.Nombre.localeCompare(b.Nombre));

    return { data, depositos: depositosMap };
  }
}
