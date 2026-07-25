import { PrismaClient, BracketType, RuleActionType } from '@prisma/client';
import { TAX_ARTICLES } from '../apps/api/src/modules/tax-engine/seed/tax-articles.seed';
import { TAX_BRACKETS } from '../apps/api/src/modules/tax-engine/seed/brackets.seed';
import { KNOWLEDGE_BASE } from '../apps/api/src/modules/tax-engine/seed/knowledge.seed';
import { TAX_RULES } from '../apps/api/src/modules/tax-engine/seed/rules.seed';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Seeding database ===');

  // 1. Admin users (comma-separated phone numbers in ADMIN_PHONE env var)
  const adminPhones = (process.env.ADMIN_PHONE || '09120000000')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const phone of adminPhones) {
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (!existing) {
      await prisma.user.create({
        data: { phone, firstName: 'مدیر', lastName: 'سیستم', role: 'admin', isActive: true },
      });
      console.log(`Admin user created: ${phone}`);
    } else {
      console.log(`Admin user already exists: ${phone}`);
    }
  }

  // 2. Categories
  const categories = [
    { name: 'مالیاتی', slug: 'tax', contentType: 'article' as const },
    { name: 'حسابداری', slug: 'accounting', contentType: 'article' as const },
    { name: 'ثبت شرکت', slug: 'registration', contentType: 'article' as const },
    { name: 'تامین اجتماعی', slug: 'social_security', contentType: 'article' as const },
    { name: 'قراردادها', slug: 'contract', contentType: 'article' as const },
    { name: 'عمومی', slug: 'general', contentType: 'article' as const },
    { name: 'آموزشی', slug: 'educational', contentType: 'video' as const },
  ];
  for (const cat of categories) {
    if (!(await prisma.category.findUnique({ where: { slug: cat.slug } }))) {
      await prisma.category.create({ data: cat });
      console.log(`  Category created: ${cat.name}`);
    }
  }

  // 3. Knowledge Base (100+ entries)
  let kbCount = 0;
  for (const entry of KNOWLEDGE_BASE) {
    const existing = await prisma.knowledgeBase.findFirst({
      where: { question: entry.question },
    });
    if (!existing) {
      await prisma.knowledgeBase.create({
        data: {
          question: entry.question,
          answer: entry.answer,
          category: entry.category,
          riskLevel: 'low',
        },
      });
      kbCount++;
    }
  }
  console.log(`Knowledge base: ${kbCount} new, ${KNOWLEDGE_BASE.length} total`);

  // 4. Tax Articles (100+ articles)
  let articleCount = 0;
  for (const article of TAX_ARTICLES) {
    const existing = await prisma.taxArticle.findFirst({
      where: {
        articleNumber: article.articleNumber,
      },
    });
    if (!existing) {
      await prisma.taxArticle.create({
        data: {
          articleNumber: article.articleNumber,
          chapterTitle: article.chapterTitle,
          text: article.text,
          notes: article.notes,
          book: article.book,
          category: article.category,
          validFrom: new Date('2023-01-01'),
          validTo: null,
          snapshotId: 'initial-seed-v1',
        },
      });
      articleCount++;
    }
  }
  console.log(`Tax articles: ${articleCount} new, ${TAX_ARTICLES.length} total`);

  // 5. Tax Brackets (1390-1405, all types)
  let bracketCount = 0;
  for (const bracket of TAX_BRACKETS) {
    const uniqueKey = {
      year_type_bracketOrder: {
        year: bracket.year,
        type: bracket.type,
        bracketOrder: bracket.bracketOrder,
      },
    };
    const existing = await prisma.taxBracket.findUnique({
      where: uniqueKey,
    });
    if (!existing) {
      await prisma.taxBracket.create({
        data: {
          year: bracket.year,
          type: bracket.type as BracketType,
          bracketOrder: bracket.bracketOrder,
          minAmount: bracket.minAmount,
          maxAmount: bracket.maxAmount,
          rate: bracket.rate,
          description: bracket.description,
          metadata: (bracket.metadata as any) ?? {},
        },
      });
      bracketCount++;
    } else {
      await prisma.taxBracket.update({
        where: uniqueKey,
        data: {
          minAmount: bracket.minAmount,
          maxAmount: bracket.maxAmount,
          rate: bracket.rate,
        },
      });
    }
  }
  console.log(`Tax brackets: ${bracketCount} new, ${TAX_BRACKETS.length} total`);

  // 6. Tax Rules
  let ruleCount = 0;
  for (const rule of TAX_RULES) {
    const existing = await prisma.taxRule.findUnique({
      where: { ruleKey: rule.ruleKey },
    });
    if (!existing) {
      await prisma.taxRule.create({
        data: {
          ruleKey: rule.ruleKey,
          type: rule.type as BracketType,
          description: rule.description,
          condition: rule.condition as any,
          action: rule.action as any,
          priority: rule.priority || 0,
          effectiveFrom: new Date('2023-01-01'),
          effectiveTo: null,
          isActive: true,
        },
      });
      ruleCount++;
    }
  }
  console.log(`Tax rules: ${ruleCount} new, ${TAX_RULES.length} total`);

  console.log('=== Seed completed ===');
  console.log(`Summary: ${kbCount} KB | ${articleCount} articles | ${bracketCount} brackets | ${ruleCount} rules`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
