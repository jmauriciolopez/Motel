const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const moteles = await prisma.motel.findMany({ take: 1 });
  const proveedores = await prisma.proveedor.findMany();
  
  console.log('=== Moteles ===');
  moteles.forEach(m => console.log(`- ${m.id}: ${m.Nombre}`));
  
  console.log('\n=== Proveedores ===');
  proveedores.forEach(p => console.log(`- ${p.id}: ${p.Nombre}`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
