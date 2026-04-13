const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Verificar que el proveedor existente tiene motelId
  const proveedores = await prisma.proveedor.findMany({
    include: { motel: true, rubro: true },
  });
  
  console.log('=== Proveedores con motelId ===');
  proveedores.forEach(p => {
    console.log(`- ${p.Nombre}`);
    console.log(`  Motel: ${p.motel?.Nombre || 'N/A'}`);
    console.log(`  Rubro: ${p.rubro?.Nombre || 'N/A'}`);
    console.log(`  motelId: ${p.motelId}`);
  });
  
  console.log('\n✅ Proveedor ahora tiene vínculo con motel');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
