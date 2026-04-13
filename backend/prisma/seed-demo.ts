import { PrismaClient, RolUsuario, EstadoHabitacion, TipoEstadia, Habitacion, Cliente } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const MOTEL_ID = 'cmnxgn6ju0003q6ypkuw9u26b';
  const PASSWORD_HASH = await bcrypt.hash('password123', 10);

  console.log('🌱 Starting seeding process...');

  // 1. Obtener Motel (debe existir)
  const motel = await prisma.motel.findUnique({
    where: { id: MOTEL_ID },
  });

  if (!motel) {
    console.error(`❌ Motel with ID ${MOTEL_ID} not found. Please create it first.`);
    return;
  }

  // 2. Usuarios (Administrador y Recepcionistas)
  const admin = await prisma.usuario.upsert({
    where: { Email: 'admin@motel.com' },
    update: {},
    create: {
      Username: 'admin_master',
      Email: 'admin@motel.com',
      PasswordHash: PASSWORD_HASH,
      Rol: RolUsuario.ADMINISTRADOR,
      Confirmed: true,
      propietarioId: motel.propietarioId,
    },
  });

  const recep1 = await prisma.usuario.upsert({
    where: { Email: 'recep1@motel.com' },
    update: {},
    create: {
      Username: 'recepcionista_juan',
      Email: 'recep1@motel.com',
      PasswordHash: PASSWORD_HASH,
      Rol: RolUsuario.RECEPCIONISTA,
      Confirmed: true,
      propietarioId: motel.propietarioId,
    },
  });

  const recep2 = await prisma.usuario.upsert({
    where: { Email: 'recep2@motel.com' },
    update: {},
    create: {
      Username: 'recepcionista_ana',
      Email: 'recep2@motel.com',
      PasswordHash: PASSWORD_HASH,
      Rol: RolUsuario.RECEPCIONISTA,
      Confirmed: true,
      propietarioId: motel.propietarioId,
    },
  });

  const recepcionistas = [recep1, recep2];

  // Vincular usuarios al motel
  for (const u of [admin, recep1, recep2]) {
    await prisma.motelUsuario.upsert({
      where: { usuarioId_motelId: { usuarioId: u.id, motelId: MOTEL_ID } },
      update: {},
      create: { usuarioId: u.id, motelId: MOTEL_ID },
    });
  }

  // 3. Depósitos
  const depositoPrincipal = await prisma.deposito.upsert({
    where: { id: 'dep-principal-id' }, 
    update: {},
    create: {
      id: 'dep-principal-id',
      Nombre: 'Depósito Principal',
      EsPrincipal: true,
      motelId: MOTEL_ID,
    },
  });

  const depositoSecundario = await prisma.deposito.upsert({
    where: { id: 'dep-secundario-id' },
    update: {},
    create: {
      id: 'dep-secundario-id',
      Nombre: 'Depósito Secundario (Bar)',
      EsPrincipal: false,
      motelId: MOTEL_ID,
    },
  });

  // 4. Rubros y Productos
  const rubroBebidas = await prisma.rubro.upsert({
    where: { id: 'rubro-bebidas-id' },
    update: {},
    create: {
      id: 'rubro-bebidas-id',
      Nombre: 'Bebidas',
      Facturable: true,
      EsMaestro: false,
      motelId: MOTEL_ID,
    },
  });

  const rubroInsumos = await prisma.rubro.upsert({
    where: { id: 'rubro-insumos-id' },
    update: {},
    create: {
      id: 'rubro-insumos-id',
      Nombre: 'Insumos / Amenities',
      Facturable: false,
      EsMaestro: false,
      motelId: MOTEL_ID,
    },
  });

  const productosFacturables = [
    { id: 'prod-cerveza', Nombre: 'Cerveza Quilmes 1L', Precio: 1500, Costo: 800, rubroId: rubroBebidas.id },
    { id: 'prod-agua', Nombre: 'Agua Villavicencio 500ml', Precio: 800, Costo: 300, rubroId: rubroBebidas.id },
    { id: 'prod-gaseosa', Nombre: 'Coca Cola 600ml', Precio: 1200, Costo: 600, rubroId: rubroBebidas.id },
  ];

  const productosNoFacturables = [
    { id: 'prod-jabon', Nombre: 'Jabón Amenity', Precio: 0, Costo: 100, rubroId: rubroInsumos.id },
    { id: 'prod-preservativo', Nombre: 'Preservativos (Insumo)', Precio: 0, Costo: 400, rubroId: rubroInsumos.id },
  ];

  for (const p of [...productosFacturables, ...productosNoFacturables]) {
    await prisma.producto.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        Nombre: p.Nombre,
        Precio: p.Precio,
        Costo: p.Costo,
        Facturable: p.Precio > 0,
        StockMinimo: 10,
        EsComun: true,
        rubroId: p.rubroId,
        motelId: MOTEL_ID,
      },
    });
    // Stock Inicial
    await prisma.stock.upsert({
      where: { id: `stock-${p.id}` },
      update: {},
      create: {
        id: `stock-${p.id}`,
        Cantidad: 100,
        depositoId: depositoPrincipal.id,
        productoId: p.id,
        motelId: MOTEL_ID,
      },
    });
  }

  // 5. Tarifas y Habitaciones
  const tarifaStandard = await prisma.tarifa.upsert({
    where: { id: 'tarifa-std' },
    update: {},
    create: {
      id: 'tarifa-std',
      Nombre: 'Tarifa Standard',
      PrecioTurno: 6000,
      PrecioDiario: 12000,
      PrecioHrDiaExcede: 1000,
      PrecioHrNocheExcede: 1500,
      motelId: MOTEL_ID,
    },
  });

  const habitaciones: Habitacion[] = [];
  for (let i = 1; i <= 5; i++) {
    const h = await prisma.habitacion.upsert({
      where: { id: `hab-${i}` },
      update: {},
      create: {
        id: `hab-${i}`,
        Identificador: `${i}`,
        Nombre: `Habitación ${i}`,
        Estado: EstadoHabitacion.DISPONIBLE,
        motelId: MOTEL_ID,
        tarifaId: tarifaStandard.id,
      },
    });
    habitaciones.push(h);
  }

  // 6. Formas de Pago
  const formaEfectivo = await prisma.formaPago.upsert({
    where: { id: 'fp-efectivo' },
    update: {},
    create: { id: 'fp-efectivo', Tipo: 'Efectivo' },
  });

  const formaTarjeta = await prisma.formaPago.upsert({
    where: { id: 'fp-tarjeta' },
    update: {},
    create: { id: 'fp-tarjeta', Tipo: 'Tarjeta Débito/Crédito' },
  });

  const formasPago = [formaEfectivo, formaTarjeta];

  // 7. Clientes
  const clientes: Cliente[] = [];
  for (let i = 1; i <= 10; i++) {
    const c = await prisma.cliente.upsert({
      where: { id: `cliente-${i}` },
      update: {},
      create: {
        id: `cliente-${i}`,
        Patente: `ABC${100 + i}`,
        Marca: i % 2 === 0 ? 'Toyota' : 'Ford',
        Color: i % 3 === 0 ? 'Blanco' : 'Gris',
        motelId: MOTEL_ID,
      },
    });
    clientes.push(c);
  }

  // --- GENERACIÓN DE HISTORIAL (Marzo 2026) ---

  console.log('📅 Generating historical data for March 2026...');

  for (let day = 1; day <= 31; day++) {
    // 8. Compras (algunos días)
    if (day % 7 === 0) {
      const fechaCompra = new Date(2026, 2, day, 10, 0);
      await prisma.compra.create({
        data: {
          Fecha: fechaCompra,
          Total: 50000 + Math.random() * 20000,
          Finalizada: true,
          depositoId: depositoPrincipal.id,
          motelId: MOTEL_ID,
          usuarioId: admin.id,
          detalles: {
            create: productosFacturables.map(p => ({
              Cantidad: 20,
              Precio: p.Costo,
              Importe: p.Costo * 20,
              productoId: p.id,
              motelId: MOTEL_ID,
            })),
          },
        },
      });
    }

    // 9. Transferencias (algunos días)
    if (day % 5 === 0) {
      await prisma.transferencia.create({
        data: {
          Fecha: new Date(2026, 2, day, 11, 0),
          Finalizada: true,
          motelId: MOTEL_ID,
          depositoOrigenId: depositoPrincipal.id,
          depositoDestinoId: depositoSecundario.id,
          usuarioId: admin.id,
          detalles: {
            create: [
              { Cantidad: 10, productoId: 'prod-cerveza', motelId: MOTEL_ID },
              { Cantidad: 12, productoId: 'prod-agua', motelId: MOTEL_ID },
            ],
          },
        },
      });
    }

    // 10. Turnos y Consumos (Diarios)
    const turnosPorDia = 2 + Math.floor(Math.random() * 4); // 2 a 5 turnos
    for (let t = 0; t < turnosPorDia; t++) {
      const horaIngreso = 10 + Math.floor(Math.random() * 12);
      const ingreso = new Date(2026, 2, day, horaIngreso, 0);
      const minutos = 60 + Math.floor(Math.random() * 120);
      const salida = new Date(ingreso.getTime() + minutos * 60000);
      
      const habitacion = habitaciones[Math.floor(Math.random() * habitaciones.length)];
      const cliente = clientes[Math.floor(Math.random() * clientes.length)];
      const recep = recepcionistas[Math.floor(Math.random() * recepcionistas.length)];

      const precioTurno = 6000;
      let totalConsumo = 0;
      const consumosData: any[] = [];

      // Con consumo (50% de probabilidad)
      if (Math.random() > 0.5) {
        const prod = productosFacturables[Math.floor(Math.random() * productosFacturables.length)];
        const cant = 1 + Math.floor(Math.random() * 3);
        const subtotal = Number(prod.Precio) * cant;
        totalConsumo += subtotal;
        consumosData.push({
          Cantidad: cant,
          Importe: subtotal,
          productoId: prod.id,
          motelId: MOTEL_ID,
        });
      }

      await prisma.turno.create({
        data: {
          habitacionId: habitacion.id,
          clienteId: cliente.id,
          tarifaId: tarifaStandard.id,
          Ingreso: ingreso,
          Salida: salida,
          TipoEstadia: TipoEstadia.Standard,
          Minutos: minutos,
          Total: precioTurno + totalConsumo,
          Precio: precioTurno,
          PagoPendiente: false,
          usuarioAperturaId: recep.id,
          usuarioCierreId: recep.id,
          consumos: {
            create: consumosData,
          },
          pago: {
            create: {
              Importe: precioTurno + totalConsumo,
              formaPagoId: formasPago[Math.floor(Math.random() * formasPago.length)].id,
              motelId: MOTEL_ID,
            },
          },
        },
      });
    }

    // 11. Extracciones de Caja (cada 4 días)
    if (day % 4 === 0) {
      await prisma.caja.create({
        data: {
          Concepto: `Extracción mensual - Día ${day}`,
          Importe: -(5000 + Math.random() * 10000),
          Saldo: 0, 
          motelId: MOTEL_ID,
        },
      });
    }
  }

  console.log('✅ Seed process finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
