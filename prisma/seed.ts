import { PrismaClient, UserRole, ContentType, ContentStatus, ContentVisibility } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@123456', 10);
  const admin = await prisma.user.upsert({
    where: { phone: '09120000000' },
    update: {},
    create: {
      phone: '09120000000',
      firstName: 'Admin',
      lastName: 'Ayantaraz',
      password: adminPassword,
      role: UserRole.admin,
      isActive: true,
      isStaff: true,
    },
  });

  // Create sample content categories
  const taxCategory = await prisma.category.upsert({
    where: { slug: 'tax-consultation' },
    update: {},
    create: {
      name: 'مشاوره مالیاتی',
      slug: 'tax-consultation',
      contentType: ContentType.article,
    },
  });

  const accountingCategory = await prisma.category.upsert({
    where: { slug: 'accounting' },
    update: {},
    create: {
      name: 'حسابداری',
      slug: 'accounting',
      contentType: ContentType.article,
    },
  });

  // Create sample articles
  await prisma.content.upsert({
    where: { slug: 'tax-laws-2024' },
    update: {},
    create: {
      contentType: ContentType.article,
      title: 'قوانین مالیاتی 1403',
      slug: 'tax-laws-2024',
      excerpt: 'آشنایی با آخرین تغییرات قوانین مالیاتی در سال 1403',
      content: 'محتوا در مورد قوانین مالیاتی...',
      status: ContentStatus.published,
      visibility: ContentVisibility.public,
      categoryId: taxCategory.id,
      authorId: admin.id,
    },
  });

  await prisma.content.upsert({
    where: { slug: 'accounting-basics' },
    update: {},
    create: {
      contentType: ContentType.article,
      title: 'اصول حسابداری',
      slug: 'accounting-basics',
      excerpt: 'مبانی و اصول اولیه حسابداری',
      content: 'محتوا در مورد اصول حسابداری...',
      status: ContentStatus.published,
      visibility: ContentVisibility.public,
      categoryId: accountingCategory.id,
      authorId: admin.id,
    },
  });

  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
