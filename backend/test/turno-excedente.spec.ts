import { PrismaClient } from '@prisma/client';
import { TurnoCalculator } from '../src/modulos/tarifas/turno-calculator';

const prisma = new PrismaClient();
const calculator = new TurnoCalculator();

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Test Failed: ${message}`);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

async function runTests() {
  console.log('\n==================================================');
  console.log('🧪 SUITE DE PRUEBAS: TURNOS CON EXCEDENTE Y PAGO');
  console.log('==================================================\n');

  // --- PRUEBA 1: Tarifa con recargo por hora explícito (> 0) ---
  console.log('--- TEST 1: Excedente con PrecioHrDiaExcede configurado ---');
  const mockMotel1 = {
    InicioDia: '08:00',
    InicioNoche: '20:00',
    HorarioUnico: true,
    DuracionDiaria: 2,
    DuracionNocturna: 2,
    Tolerancia: 15,
  };
  const mockTarifa1 = {
    PrecioTurno: 40000,
    PrecioHrDiaExcede: 15000,
    PrecioHrNocheExcede: 15000,
  };

  // Ingreso hace 3.5 horas (210 min), duracion base 2 horas (120 min) -> demora 90 min (2 horas extra tarifadas)
  const ingreso1 = new Date(Date.now() - 210 * 60000);
  const mockTurno1 = {
    Ingreso: ingreso1,
    Minutos: 120,
    Precio: 40000,
    Total: 40000,
    pagos: [],
    consumos: [],
  };

  const res1 = calculator.calculateClosingValues(mockTurno1 as any, {
    motel: mockMotel1 as any,
    tarifa: mockTarifa1 as any,
  });

  assert(res1.PrecioCalculo === 70000, `PrecioCalculo debe ser 70000 (40000 + 2*15000), obtenido: ${res1.PrecioCalculo}`);
  assert(res1.Total === 70000, `Total debe ser 70000, obtenido: ${res1.Total}`);


  // --- PRUEBA 2: Tarifa sin recargo por hora (0) -> Regla de Turno Entero Nuevo ---
  console.log('\n--- TEST 2: Excedente con PrecioHrDiaExcede = 0 (Turno Entero Nuevo) ---');
  const mockTarifa2 = {
    PrecioTurno: 40000,
    PrecioHrDiaExcede: 0,
    PrecioHrNocheExcede: 0,
  };

  // Ingreso hace 2.5 horas (150 min), duracion 120 min -> demora 30 min (> tolerancia 15) -> 1 turno entero nuevo
  const ingreso2 = new Date(Date.now() - 150 * 60000);
  const mockTurno2 = {
    Ingreso: ingreso2,
    Minutos: 120,
    Precio: 40000,
    Total: 40000,
    pagos: [],
    consumos: [],
  };

  const res2 = calculator.calculateClosingValues(mockTurno2 as any, {
    motel: mockMotel1 as any,
    tarifa: mockTarifa2 as any,
  });

  assert(res2.PrecioCalculo === 80000, `PrecioCalculo debe ser 80000 (40000 base + 40000 turno nuevo), obtenido: ${res2.PrecioCalculo}`);
  assert(res2.Total === 80000, `Total debe ser 80000, obtenido: ${res2.Total}`);


  // --- PRUEBA 3: Preservación de Descuentos en Efectivo ---
  console.log('\n--- TEST 3: Retención de descuento en efectivo en recálculos subsecuentes ---');
  // Turno2 con pago de $72000 (descuento del 10% sobre $80000)
  const mockTurno3 = {
    Ingreso: ingreso2,
    Minutos: 120,
    Precio: 40000,
    Total: 72000, // DB Total actual tras descuento de 8000
    pagos: [{ Importe: 72000 }],
    consumos: [],
  };

  const res3 = calculator.calculateClosingValues(mockTurno3 as any, {
    motel: mockMotel1 as any,
    tarifa: mockTarifa2 as any,
  });

  assert(res3.Total === 72000, `Total con descuento debe ser 72000, obtenido: ${res3.Total}`);
  const saldoCalculado3 = Math.max(0, res3.Total - 72000);
  assert(saldoCalculado3 === 0, `SaldoPendiente debe ser 0, obtenido: ${saldoCalculado3}`);


  // --- PRUEBA 3b: Cierre posterior no debe reabrir el descuento (caso A02) ---
  console.log('\n--- TEST 3b: Cerrar tras cobro con descuento no regenera saldo ---');
  const ingresoCerrado = new Date(Date.now() - 136 * 60000);
  const mockTurnoCerrado = {
    Ingreso: ingresoCerrado,
    Minutos: 120,
    Precio: 80000,
    Total: 72000,
    Observacion: '[Descuento Efectivo 10%] Total original: $80.000 - Descuento: $8.000',
    pagos: [{ Importe: 72000 }],
    consumos: [],
  };
  const resCierre = calculator.calculateClosingValues(mockTurnoCerrado as any, {
    motel: mockMotel1 as any,
    tarifa: mockTarifa2 as any,
  });
  assert(resCierre.Total === 72000, `Total al cerrar debe conservar el descuento (72000), obtenido: ${resCierre.Total}`);
  const saldoCierre = Math.max(0, resCierre.Total - 72000);
  assert(saldoCierre === 0, `Saldo al cerrar debe ser 0, obtenido: ${saldoCierre}`);

  const mockTurnoBugPersistido = {
    ...mockTurnoCerrado,
    Total: 80000,
  };
  const resBug = calculator.calculateClosingValues(mockTurnoBugPersistido as any, {
    motel: mockMotel1 as any,
    tarifa: mockTarifa2 as any,
  });
  assert(resBug.Total === 72000, `Total debe reconstruirse desde la observación (72000), obtenido: ${resBug.Total}`);


  // --- PRUEBA 4: Prueba Integración con Base de Datos Prisma ---
  console.log('\n--- TEST 4: Prueba de Integración Real en Base de Datos ---');
  const motelDb = await prisma.motel.findFirst();
  const habDb = await prisma.habitacion.findFirst({
    where: { motelId: motelDb?.id, deletedAt: null },
    include: { tarifa: true },
  });
  const clienteDb = await prisma.cliente.findFirst({
    where: { motelId: motelDb?.id, deletedAt: null },
  });
  const usuarioDb = await prisma.usuario.findFirst();

  if (!motelDb || !habDb || !clienteDb || !usuarioDb || !habDb.tarifa) {
    console.log('⚠️ Omitiendo Test 4 (falta datos semilla de motel/habitación/cliente/usuario)');
  } else {
    console.log(`Creando turno de prueba en habitación ${habDb.Identificador}...`);
    // Ingreso simulado hace 3 horas (atrasado intencionalmente para generar excedente)
    const fechaAtrasada = new Date(Date.now() - 180 * 60000);

    const testTurnoDb = await prisma.turno.create({
      data: {
        habitacionId: habDb.id,
        clienteId: clienteDb.id,
        tarifaId: habDb.tarifaId!,
        usuarioAperturaId: usuarioDb.id,
        Ingreso: fechaAtrasada,
        Precio: Number(habDb.tarifa.PrecioTurno),
        Total: Number(habDb.tarifa.PrecioTurno),
        SaldoPendiente: Number(habDb.tarifa.PrecioTurno),
        PagoPendiente: true,
        Minutos: 120,
        TipoEstadia: 'Standard',
        Observacion: '[TEST AUTOMATIZADO EXCEDENTE]',
      },
      include: {
        habitacion: { include: { motel: true, tarifa: true } },
        tarifa: true,
        pagos: true,
      },
    });

    console.log(`Turno Creado ID: ${testTurnoDb.id}`);

    // Probar calculador sobre turno de DB
    const resDb = calculator.calculateClosingValues(testTurnoDb as any, {
      motel: testTurnoDb.habitacion.motel as any,
      tarifa: (testTurnoDb.tarifa || testTurnoDb.habitacion.tarifa) as any,
    });

    const precioBase = Number(testTurnoDb.tarifa.PrecioTurno);
    console.log(`Precio Base: $${precioBase} | Total Calculado con Excedente: $${resDb.Total}`);
    assert(resDb.Total > precioBase, 'El Total calculado debe superar el Precio Base por el excedente acumulado');

    // Limpieza: eliminar turno de prueba de DB
    await prisma.turno.delete({ where: { id: testTurnoDb.id } });
    console.log(`✅ Turno de prueba ${testTurnoDb.id} eliminado correctamente de la BD.`);
  }

  console.log('\n==================================================');
  console.log('🎉 TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE');
  console.log('==================================================\n');
}

runTests()
  .catch((err) => {
    console.error('\n❌ ERROR EN PRUEBAS:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
