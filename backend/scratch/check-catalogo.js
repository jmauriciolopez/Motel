const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const catalogoCount = await prisma.catalogoProducto.count();
  const rubrosCount = await prisma.rubro.count({ where: { motelId: null } });
  
  console.log('=== Estado de la Base de Datos ===');
  console.log(`Productos en catálogo: ${catalogoCount}`);
  console.log(`Rubros maestros: ${rubrosCount}`);
  
  if (catalogoCount === 0) {
    console.log('\n⚠️  El catálogo está vacío. Ejecuta: npm run seed');
  }
  
  if (rubrosCount === 0) {
    console.log('\n⚠️  No hay rubros maestros. Ejecuta: npm run seed');
  }
  
  // Mostrar algunos productos del catálogo
  if (catalogoCount > 0) {
    const productos = await prisma.catalogoProducto.findMany({
      take: 5,
      include: { rubro: true },
    });
    console.log('\n=== Primeros 5 productos del catálogo ===');
    productos.forEach(p => {
      console.log(`- ${p.Nombre} (${p.rubro.Nombre}) - $${p.Precio}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
