import { PrismaClient, UserRole, ContentType, ContentStatus, ContentVisibility } from '@prisma/client';
import * as bcrypt from 'bcrypto';

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
      summary: 'مروری بر آخرین تغییرات قوانین مالیاتی در سال 1403',
      body: '<p>در سال 1403، تغییرات مهمی در قوانین مالیاتی اعمال شده است...</p>',
      metaDescription: 'آخرین تغییرات قوانین مالیاتی 1403',
      tags: 'مالیاتی,قوانین,1403',
      status: ContentStatus.published,
      visibility: ContentVisibility.public,
      publishedAt: new Date(),
      authorId: admin.id,
      categoryId: taxCategory.id,
    },
  });

  await prisma.content.upsert({
    where: { slug: 'accounting-basics' },
    update: {},
    create: {
      contentType: ContentType.article,
      title: 'اصول حسابداری مدرن',
      slug: 'accounting-basics',
      summary: 'آشنایی با اصول پایه حسابداری',
      body: '<p>حسابداری مدرن بر پایه استانداردهای بین‌المللی...</p>',
      metaDescription: 'اصول پایه حسابداری مدرن',
      tags: 'حسابداری,مبانی,آموزش',
      status: ContentStatus.published,
      visibility: ContentVisibility.public,
      publishedAt: new Date(),
      authorId: admin.id,
      categoryId: accountingCategory.id,
    },
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
