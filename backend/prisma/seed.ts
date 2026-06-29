import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { OrderStatus, PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function seedUsers(): Promise<number> {
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const staffPasswordHash = await bcrypt.hash('staff123', 10);

  const admin = await prisma.user.upsert({
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

  return admin.id;
}

/** Clears transactional + catalog data (keeps users) so the seed is repeatable. */
async function clearData(): Promise<void> {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.finance.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.category.deleteMany();
}

function monthsAgo(offset: number, day: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - offset, day);
}

async function main(): Promise<void> {
  const adminId = await seedUsers();
  await clearData();

  // --- Categories ---
  const categoryData = [
    { name: 'Classic', emoji: '🍪' },
    { name: 'Chocolate', emoji: '🍫' },
    { name: 'Fruity', emoji: '🍓' },
    { name: 'Seasonal', emoji: '🎄' },
    { name: 'Custom', emoji: '🎨' },
  ];
  const categories: Record<string, number> = {};
  for (const c of categoryData) {
    const created = await prisma.category.create({ data: c });
    categories[c.name] = created.id;
  }

  // --- Products ---
  const productData = [
    { name: 'Butter Classic Rounds', price: 12.0, stock: 25, isFeatured: true, category: 'Classic', description: 'Buttery shortbread rounds, our signature bake.' },
    { name: 'Double Chocolate Chunk', price: 15.0, stock: 18, isFeatured: true, category: 'Chocolate', description: 'Rich cocoa cookies loaded with chocolate chunks.' },
    { name: 'Strawberry Shortbread', price: 13.5, stock: 12, category: 'Fruity', description: 'Crumbly shortbread with real strawberry.' },
    { name: 'Salted Caramel Crinkle', price: 14.0, stock: 8, category: 'Chocolate', description: 'Gooey salted caramel with a crinkle top.' },
    { name: 'Matcha Almond Biscotti', price: 16.0, stock: 5, category: 'Classic', description: 'Crunchy matcha biscotti with toasted almonds.' },
    { name: 'Oatmeal Raisin Classic', price: 11.0, stock: 30, category: 'Classic', description: 'Chewy oatmeal cookies with plump raisins.' },
    { name: 'Festive Snowflake Set', price: 22.0, stock: 0, isAvailable: false, category: 'Seasonal', description: 'Decorated snowflake cookies for the holidays.' },
    { name: 'Custom Name Cookies', price: 25.0, stock: 15, isFeatured: true, category: 'Custom', description: 'Personalised iced cookies with any name.' },
  ];
  const products: Record<string, number> = {};
  for (const p of productData) {
    const created = await prisma.product.create({
      data: {
        name: p.name,
        description: p.description,
        price: p.price,
        stock: p.stock,
        isAvailable: p.isAvailable ?? true,
        isFeatured: p.isFeatured ?? false,
        categoryId: categories[p.category],
      },
    });
    products[p.name] = created.id;
  }

  // --- Customers ---
  const customerData = [
    { name: 'Aishah Rahman', email: 'aishah@email.com', phone: '012-3456789' },
    { name: 'Priya Nair', email: 'priya@email.com', phone: '016-7891234' },
    { name: 'Chen Wei', email: 'chenwei@email.com', phone: '011-2345678' },
  ];
  const customers: Record<string, number> = {};
  for (const c of customerData) {
    const created = await prisma.customer.create({ data: c });
    customers[c.email] = created.id;
  }

  // --- Orders (product stock above is the current value, so we don't re-deduct here) ---
  const orderData: {
    orderNumber: string;
    customerEmail: string;
    status: OrderStatus;
    items: { product: string; quantity: number }[];
  }[] = [
    { orderNumber: 'BBB-2024-0001', customerEmail: 'aishah@email.com', status: OrderStatus.DELIVERED, items: [{ product: 'Butter Classic Rounds', quantity: 2 }, { product: 'Double Chocolate Chunk', quantity: 1 }] },
    { orderNumber: 'BBB-2024-0002', customerEmail: 'priya@email.com', status: OrderStatus.BAKING, items: [{ product: 'Custom Name Cookies', quantity: 3 }] },
    { orderNumber: 'BBB-2024-0003', customerEmail: 'chenwei@email.com', status: OrderStatus.PENDING, items: [{ product: 'Matcha Almond Biscotti', quantity: 1 }] },
    { orderNumber: 'BBB-2024-0004', customerEmail: 'aishah@email.com', status: OrderStatus.CONFIRMED, items: [{ product: 'Festive Snowflake Set', quantity: 2 }] },
    { orderNumber: 'BBB-2024-0005', customerEmail: 'priya@email.com', status: OrderStatus.READY, items: [{ product: 'Strawberry Shortbread', quantity: 1 }, { product: 'Salted Caramel Crinkle', quantity: 1 }] },
  ];
  const priceOf: Record<string, number> = Object.fromEntries(productData.map((p) => [p.name, p.price]));
  for (const o of orderData) {
    const total = o.items.reduce((sum, item) => sum + priceOf[item.product] * item.quantity, 0);
    await prisma.order.create({
      data: {
        orderNumber: o.orderNumber,
        customerId: customers[o.customerEmail],
        staffId: adminId,
        status: o.status,
        totalAmount: total,
        orderItems: {
          create: o.items.map((item) => ({
            productId: products[item.product],
            quantity: item.quantity,
            unitPrice: priceOf[item.product],
          })),
        },
      },
    });
  }

  // --- Finance (spread across the last 3 months for the chart) ---
  const financeData = [
    { type: 'IN' as const, amount: 450, desc: 'Weekend cookie sales', category: 'Orders', date: monthsAgo(0, 5) },
    { type: 'OUT' as const, amount: 180, desc: 'Flour and butter restock', category: 'Ingredients', date: monthsAgo(0, 3) },
    { type: 'IN' as const, amount: 250, desc: 'Custom birthday order', category: 'Orders', date: monthsAgo(0, 10) },
    { type: 'IN' as const, amount: 200, desc: 'Walk-in sales', category: 'Other Income', date: monthsAgo(0, 18) },
    { type: 'OUT' as const, amount: 90, desc: 'Gift boxes and ribbons', category: 'Packaging', date: monthsAgo(1, 12) },
    { type: 'IN' as const, amount: 520, desc: 'Corporate gift order', category: 'Orders', date: monthsAgo(1, 15) },
    { type: 'OUT' as const, amount: 1200, desc: 'New stand mixer', category: 'Equipment', date: monthsAgo(1, 2) },
    { type: 'IN' as const, amount: 300, desc: 'Market stall sales', category: 'Orders', date: monthsAgo(2, 20) },
    { type: 'OUT' as const, amount: 75, desc: 'Instagram ads', category: 'Marketing', date: monthsAgo(2, 8) },
    { type: 'OUT' as const, amount: 60, desc: 'Electricity bill', category: 'Utilities', date: monthsAgo(2, 25) },
  ];
  for (const f of financeData) {
    await prisma.finance.create({ data: { ...f, staffId: adminId } });
  }

  console.log(
    `✅ Seeded: 2 users, ${categoryData.length} categories, ${productData.length} products, ` +
      `${customerData.length} customers, ${orderData.length} orders, ${financeData.length} finance entries`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
