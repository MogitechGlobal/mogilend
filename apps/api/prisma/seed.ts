import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Seed Roles - Updated to include missing Staff Roles
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'Super Admin' },
    update: {},
    create: { name: 'Super Admin', permissions: ['all'] },
  });

  const lenderAdminRole = await prisma.role.upsert({
    where: { name: 'Lender Admin' },
    update: {},
    create: { name: 'Lender Admin', permissions: ['manage_lender', 'approve_loan'] },
  });

  const branchManagerRole = await prisma.role.upsert({
    where: { name: 'Branch Manager' },
    update: {},
    create: { name: 'Branch Manager', permissions: ['manage_branch'] },
  });

  const loanOfficerRole = await prisma.role.upsert({
    where: { name: 'Loan Officer' },
    update: {},
    create: { name: 'Loan Officer', permissions: ['create_loan', 'view_borrowers'] },
  });

  console.log('✅ All Roles (Super Admin, Lender Admin, Branch Manager, Loan Officer) seeded.');

  // 2. Seed System User (ID: "0" strictly for automated transaction tracing)
  await prisma.user.upsert({
    where: { id: '0' },
    update: {},
    create: {
      id: '0',
      email: 'system@mogifintech.internal',
      password_hash: 'UNUSABLE_SYSTEM_PASSWORD',
      role_id: superAdminRole.id,
    },
  });

  // 3. Seed a Default Institutional Tenant
  const defaultLender = await prisma.lender.upsert({
    where: { id: '5b1a0b35-2a91-461e-ba7b-c2d1301ea98e' }, 
    update: {
      name: 'Mogi Credit Services',
      email: 'info@mogicredit.com',
      phone: '254700000000',
    },
    create: {
      id: '5b1a0b35-2a91-461e-ba7b-c2d1301ea98e',
      name: 'Mogi Credit Services',
      email: 'info@mogicredit.com', 
      phone: '254700000000',
    }
  });

  // 4. Seed a Default Branch
  const defaultBranch = await prisma.branch.upsert({
    where: { id: '99374d4b-7349-4681-ad2d-362b99f85314' }, 
    update: {},
    create: {
      id: '99374d4b-7349-4681-ad2d-362b99f85314',
      lender_id: defaultLender.id,
      name: 'Headquarters',
      location: 'Nairobi CBD',
    }
  });
  console.log('✅ Default Lender and Branch seeded.');

  // 5. Seed the Demo Super Admin (Linked to the Lender)
  const adminPassword = await bcrypt.hash('Admin@2026', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@mogifintech.com' },
    update: {
        lender_id: defaultLender.id 
    },
    create: {
      email: 'admin@mogifintech.com',
      password_hash: adminPassword,
      role_id: superAdminRole.id,
      lender_id: defaultLender.id, 
    },
  });
  
  console.log('✅ Super Admin account created and linked to tenant.');
  console.log('-----------------------------------');
  console.log(`📧 Email:    ${admin.email}`);
  console.log(`🔑 Password: Admin@2026`);
  console.log('-----------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });