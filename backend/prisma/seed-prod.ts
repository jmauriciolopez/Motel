/**
 * Seed de producción — datos maestros y SuperAdmin.
 * No crea moteles ni datos operativos.
 *
 * Uso desde Render Shell:
 *   npm run seed:prod
 *   SUPERADMIN_EMAIL=tu@email.com SUPERADMIN_PASSWORD=ClaveSegura! npm run seed:prod
 */
import { PrismaClient, RolUsuario } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Todos los rubros presentes en catalogo-productos.json
const RUBROS_MAESTROS = [
  { nombre: 'Alimentos',           facturable: true  },
  { nombre: 'Bebidas',             facturable: true  },
  { nombre: 'Bebidas Alcoholicas', facturable: true  },
  { nombre: 'Snacks',              facturable: true  },
  { nombre: 'Intimo',              facturable: true  },
  { nombre: 'Tabaco',              facturable: true  },
  { nombre: 'RoomService',         facturable: true  },
  { nombre: 'Amenities',           facturable: false },
  { nombre: 'Higiene',             facturable: false },
  { nombre: 'Limpieza',            facturable: false },
  { nombre: 'Blanqueria',          facturable: false },
  { nombre: 'Lavandería',          facturable: false },
];

const FORMAS_PAGO = [
  'Efectivo',
  'Tarjeta Débito',
  'Tarjeta Crédito',
  'Transferencia',
  'Mercado Pago',
];

async function main() {
  console.log('🌱 Iniciando seed de producción...');

  // 1. SuperAdmin
  const superAdminEmail    = process.env.SUPERADMIN_EMAIL    || 'superadmin@sistema.com';
  const superAdminPassword = process.env.SUPERADMIN_PASSWORD || 'CambiarEstaClaveYa!2026';
  const passwordHash = await bcrypt.hash(superAdminPassword, 10);

  const superAdmin = await prisma.usuario.upsert({
    where:  { Email: superAdminEmail },
    update: {},
    create: {
      Username:     'superadmin',
      Email:        superAdminEmail,
      PasswordHash: passwordHash,
      Rol:          RolUsuario.SUPERADMIN,
      Confirmed:    true,
    },
  });
  console.log(`✅ SuperAdmin: ${superAdmin.Email}`);

  // 2. Movilidades
  const movilidades = [
    'Automovil',
    'Moto',
    'Peaton',
  ];
  for (const tipo of movilidades) {
    const id = `mov-${tipo}`;
    await prisma.movilidad.upsert({
      where:  { id },
      update: {},
      create: { id, Tipo: tipo },
    });
  }
  console.log(`✅ Movilidades: ${movilidades.length}`);

  // 3. Formas de pago
  for (const tipo of FORMAS_PAGO) {
    const id = `fp-${tipo.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
    await prisma.formaPago.upsert({
      where:  { id },
      update: {},
      create: { id, Tipo: tipo },
    });
  }
  console.log(`✅ Formas de pago: ${FORMAS_PAGO.length}`);

  // 3. Rubros maestros (globales, sin motelId)
  const rubroMap: Record<string, string> = {};
  for (const r of RUBROS_MAESTROS) {
    const id = `rubro-maestro-${r.nombre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
    const rubro = await prisma.rubro.upsert({
      where:  { id },
      update: {},
      create: {
        id,
        Nombre:     r.nombre,
        Facturable: r.facturable,
        EsMaestro:  true,
        motelId:    null,
      },
    });
    rubroMap[r.nombre] = rubro.id;
  }
  console.log(`✅ Rubros maestros: ${RUBROS_MAESTROS.length}`);

  // 4. Catálogo de productos
  const catalogoPath = path.join(__dirname, 'catalogo-productos.json');
  if (!fs.existsSync(catalogoPath)) {
    console.warn('⚠️  catalogo-productos.json no encontrado, saltando catálogo');
  } else {
    const catalogo: Array<{
      Nombre: string;
      Precio: number;
      Costo?: number;
      Facturable?: boolean;
      StockMinimo?: number;
      Descripcion?: string;
      CriterioBusqueda?: string;
      rubro: string;
    }> = JSON.parse(fs.readFileSync(catalogoPath, 'utf-8'));

    let creados = 0;
    let omitidos = 0;
    for (const item of catalogo) {
      const rubroId = rubroMap[item.rubro];
      if (!rubroId) {
        console.warn(`  ⚠️  Rubro no encontrado: "${item.rubro}" (producto: ${item.Nombre})`);
        omitidos++;
        continue;
      }
      const id = `cat-${item.Nombre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 50)}`;
      await prisma.catalogoProducto.upsert({
        where:  { id },
        update: {},
        create: {
          id,
          Nombre:           item.Nombre,
          Precio:           item.Precio,
          Costo:            item.Costo ?? 0,
          Facturable:       item.Facturable ?? true,
          StockMinimo:      item.StockMinimo ?? 5,
          Descripcion:      item.Descripcion ?? null,
          CriterioBusqueda: item.CriterioBusqueda ?? null,
          rubroId,
        },
      });
      creados++;
    }
    console.log(`✅ Catálogo de productos: ${creados} creados, ${omitidos} omitidos`);
  }

  console.log('\n🎉 Seed de producción completado.');
  console.log('\n📋 Credenciales SuperAdmin:');
  console.log(`   Email:    ${superAdminEmail}`);
  console.log(`   Password: ${superAdminPassword}`);
  console.log('\n⚠️  Cambiá la contraseña del SuperAdmin después del primer login.');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
