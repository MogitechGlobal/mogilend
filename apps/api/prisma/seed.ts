import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding default system roles...');

  const defaultRoles = [
    'Super Admin',
    'Lender Admin',
    'Branch Manager',
    'Loan Officer',
    'Cashier'
  ];

  for (const roleName of defaultRoles) {
    // upsert ensures it only creates the role if it doesn't already exist!
    await prisma.role.upsert({
      where: { name: roleName },
      update: {}, 
      create: { 
        name: roleName,
        permissions: [] // You can expand these string arrays later!
      },
    });
  }

  console.log('✅ Roles seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });