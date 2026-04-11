import { PrismaClient, RolUsuario } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed...');

  // 1. Crear Propietario
  const propietario = await prisma.propietario.upsert({
    where: { Email: 'propietario@motel.com' },
    update: {},
    create: {
      Nombre: 'Propietario',
      Email: 'propietario@motel.com',
      FormaPago: 'EFECTIVO',
      Activo: true,
      OnboardingCompleto: true,
    },
  });

  // 2. Crear Motel
  const motel = await prisma.motel.upsert({
    where: { id: 'seed-motel-1' },
    update: {},
    create: {
      id: 'seed-motel-1',
      Nombre: 'Motel del Sol',
      HorarioUnico: true,
      Tolerancia: 15,
      DuracionDiaria: 12,
      DuracionNocturna: 12,
      MaxHrAdicional: 2,
      propietarioId: propietario.id,
    },
  });

  // 3. Hash de contraseña para Superadmin
  const passwordHash = await bcrypt.hash('admin123', 10);

  // 4. Crear Superadmin (dueño del SaaS, sin propietario ni motel asignado)
  await prisma.usuario.upsert({
    where: { Email: 'superadmin@motel.com' },
    update: {
      PasswordHash: passwordHash,
      Rol: RolUsuario.SUPERADMIN,
    },
    create: {
      Username: 'superadmin',
      Email: 'superadmin@motel.com',
      PasswordHash: passwordHash,
      Rol: RolUsuario.SUPERADMIN,
      Confirmed: true,
    },
  });

  // 6. Formas de Pago globales (únicas para todo el sistema)
  const formasPago = [
    { id: 'fp-efectivo', Tipo: 'Efectivo' },
    { id: 'fp-transferencia', Tipo: 'Transferencia' },
    { id: 'fp-tarjeta-credito', Tipo: 'Tarjeta de Crédito' },
    { id: 'fp-debito', Tipo: 'Débito' },
  ];

  for (const fp of formasPago) {
    await prisma.formaPago.upsert({
      where: { id: fp.id },
      update: {},
      create: fp,
    });
  }

  // 7. Movilidades
  const movilidades = [
    { id: 'mov-moto', Tipo: 'Moto' },
    { id: 'mov-auto', Tipo: 'Auto' },
    { id: 'mov-peatón', Tipo: 'Peatón' },
  ];

  for (const mov of movilidades) {
    await prisma.movilidad.upsert({
      where: { id: mov.id },
      update: {},
      create: mov,
    });
  }

  // 8. Catálogo de productos maestro (rubros globales + productos del catálogo)
  type CatalogoItem = {
    Nombre: string;
    Precio: number;
    Costo: number;
    Facturable: boolean;
    StockMinimo: number;
    rubro: string;
  };

  const catalogoRaw: CatalogoItem[] = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'catalogo-productos.json'), 'utf-8'),
  );

  // Obtener rubros únicos del JSON
  const rubrosUnicos = [...new Set(catalogoRaw.map((p) => p.rubro))];

  // Upsert rubros maestros (sin motelId)
  const rubrosMap: Record<string, string> = {};
  for (const nombre of rubrosUnicos) {
    const id = `rubro-maestro-${nombre.toLowerCase().replace(/\s+/g, '-')}`;
    await prisma.rubro.upsert({
      where: { id },
      update: {},
      create: {
        id,
        Nombre: nombre,
        Facturable: !['Amenities', 'Higiene', 'Limpieza', 'Blanqueria', 'Lavandería'].includes(nombre),
        EsMaestro: true,
        motelId: null,
      },
    });
    rubrosMap[nombre] = id;
  }

  // Upsert productos del catálogo
  let catalogoCount = 0;
  for (const item of catalogoRaw) {
    const id = `cat-${item.rubro.toLowerCase().replace(/\s+/g, '-')}-${item.Nombre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
    await prisma.catalogoProducto.upsert({
      where: { id },
      update: {
        Precio: item.Precio,
        Costo: item.Costo,
        Facturable: item.Facturable,
        StockMinimo: item.StockMinimo,
      },
      create: {
        id,
        Nombre: item.Nombre,
        Precio: item.Precio,
        Costo: item.Costo,
        Facturable: item.Facturable,
        StockMinimo: item.StockMinimo,
        rubroId: rubrosMap[item.rubro],
      },
    });
    catalogoCount++;
  }

  console.log('Seed finalizado con éxito:');
  console.log(`- Superadmin: superadmin@motel.com / admin123`);
  console.log(`- Motel: ${motel.Nombre}`);
  console.log(`- Formas de pago: ${formasPago.map(f => f.Tipo).join(', ')}`);
  console.log(`- Movilidades: ${movilidades.map(m => m.Tipo).join(', ')}`);
  console.log(`- Rubros maestros: ${rubrosUnicos.join(', ')}`);
  console.log(`- Catálogo de productos: ${catalogoCount} items`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
