import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

// PR #1 (auth) seeds users so login is testable end-to-end.
// PR #3 will extend this with categories, products, customers, orders, and finance entries.
async function seedUsers(): Promise<void> {
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const staffPasswordHash = await bcrypt.hash('staff123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@butterbloombatter.com' },
    update: {},
    create: {
      email: 'admin@butterbloombatter.com',
      passwordHash: adminPasswordHash,
      name: 'Admin',
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: 'staff@butterbloombatter.com' },
    update: {},
    create: {
      email: 'staff@butterbloombatter.com',
      passwordHash: staffPasswordHash,
      name: 'Staff',
      role: Role.STAFF,
    },
  });

  console.log('✅ Seeded users: admin@butterbloombatter.com / staff@butterbloombatter.com');
}

async function main(): Promise<void> {
  await seedUsers();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
