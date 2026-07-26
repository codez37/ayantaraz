import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

interface TaxLawKnowledge {
  title: string;
  chapters: TaxLawChapter[];
}

interface TaxLawChapter {
  title: string;
  articles: TaxLawArticle[];
}

interface TaxLawArticle {
  number: string;
  text: string;
  notes: string[];
}

const CHAPTER_CATEGORY_MAP: [RegExp, string][] = [
  [/مالیات بر ارث/, 'INHERITANCE'],
  [/مالیات بر درآمد املاک|مستغلات مسکونی خالی|اراضی بایر/, 'PROPERTY_INCOME'],
  [/مالیات بر درآمد حقوق/, 'SALARY'],
  [/مالیات بر درآمد مشاغل/, 'BUSINESS'],
  [/مالیات بر درآمد اشخاص حقوقی/, 'CORPORATE'],
  [/مالیات درآمد اتفاقی/, 'INCIDENTAL_INCOME'],
  [/معافیت/, 'EXEMPTION'],
  [/تشویق|جرم/, 'PENALTIES'],
  [/مراجع تشخیص|ترتیب رسیدگی|حل اختلاف|شورای عالی/, 'TAX_AUTHORITIES'],
  [/حق تمبر/, 'STAMP_DUTY'],
];

@Injectable()
export class MigrateKnowledgeService {
  private readonly logger = new Logger(MigrateKnowledgeService.name);

  constructor(private readonly prisma: PrismaService) {}

  async migrate(): Promise<{ migrated: number; errors: string[] }> {
    const errors: string[] = [];
    let migrated = 0;

    const p = path.join(__dirname, 'tax-law-knowledge.json');

    if (!fs.existsSync(p)) {
      errors.push(`Knowledge file not found at ${p}`);
      return { migrated: 0, errors };
    }

    const knowledge: TaxLawKnowledge = JSON.parse(
      fs.readFileSync(p, 'utf-8'),
    ) as TaxLawKnowledge;

    for (const chapter of knowledge.chapters) {
      const category = this.detectCategory(chapter.title);
      const validFrom = new Date('2016-03-20');

      for (const article of chapter.articles) {
        if (!article.number || !article.text) {
          continue;
        }

        try {
          await this.prisma.taxArticle.upsert({
            where: {
              articleNumber_validFrom: {
                articleNumber: article.number.trim(),
                validFrom,
              },
            },
            create: {
              articleNumber: article.number.trim(),
              text: article.text,
              notes: article.notes || [],
              chapterTitle: chapter.title,
              book: 'DIRECT' as const,
              category: (category || undefined) as
                | 'INHERITANCE'
                | 'PROPERTY_INCOME'
                | 'SALARY'
                | 'BUSINESS'
                | 'CORPORATE'
                | 'INCIDENTAL_INCOME'
                | 'EXEMPTION'
                | 'PENALTIES'
                | 'TAX_AUTHORITIES'
                | 'STAMP_DUTY'
                | undefined,
              validFrom,
              validTo: null,
              snapshotId: `snap_${article.number.trim()}`,
              isLatest: true,
            },
            update: {
              text: article.text,
              notes: article.notes || [],
              isLatest: true,
              chapterTitle: chapter.title,
              category: (category || undefined) as
                | 'INHERITANCE'
                | 'PROPERTY_INCOME'
                | 'SALARY'
                | 'BUSINESS'
                | 'CORPORATE'
                | 'INCIDENTAL_INCOME'
                | 'EXEMPTION'
                | 'PENALTIES'
                | 'TAX_AUTHORITIES'
                | 'STAMP_DUTY'
                | undefined,
            },
          });
          migrated++;
        } catch (err) {
          const msg = `Error migrating article ${article.number}: ${err instanceof Error ? err.message : String(err)}`;
          this.logger.error(msg);
          errors.push(msg);
        }
      }
    }

    this.logger.log(
      `Migration complete: ${migrated} articles, ${errors.length} errors`,
    );
    return { migrated, errors };
  }

  private detectCategory(chapterTitle: string): string | null {
    for (const [pattern, category] of CHAPTER_CATEGORY_MAP) {
      if (pattern.test(chapterTitle)) {
        return category;
      }
    }
    return null;
  }

  private mapBook(_book: string): string {
    return _book;
  }
}
