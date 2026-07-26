import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { normalizePersian } from './normalizer';
import { stem } from './stemmer';
import { extractBigrams } from './bigram';
import { SearchResult } from '../interfaces/search-result.interface';

@Injectable()
export class PersianSearchEngineService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: string, limit = 5): Promise<SearchResult[]> {
    const terms = stem(query);
    const bigrams = extractBigrams(terms);
    const now = new Date();

    const articles = await this.prisma.taxArticle.findMany({
      where: {
        validFrom: { lte: now },
        AND: [
          { OR: [{ validTo: null }, { validTo: { gte: now } }] },
          {
            OR: [
              ...terms.map((t) => ({
                text: { contains: t, mode: 'insensitive' as const },
              })),
              ...bigrams.map((b) => ({
                text: { contains: b, mode: 'insensitive' as const },
              })),
            ],
          },
        ],
      },
    });

    const scored = articles
      .map((article) => ({
        articleNumber: article.articleNumber,
        title: `ماده ${article.articleNumber}`,
        text: article.text,
        notes: article.notes,
        book: article.book,
        score: this.calculateScore(article, terms, bigrams),
      }))
      .filter((r) => r.score >= 2)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.articleNumber.localeCompare(b.articleNumber, undefined, {
          numeric: true,
        });
      })
      .slice(0, limit);

    return scored.map(({ book, ...rest }) => ({
      ...rest,
      book: book,
    }));
  }

  async getArticleById(id: number) {
    return this.prisma.taxArticle.findUnique({ where: { id } });
  }

  private calculateScore(
    article: {
      text: string;
      notes: string[];
      articleNumber: string;
    },
    queryTerms: string[],
    queryBigrams: string[],
  ): number {
    const text = normalizePersian(article.text);
    const notes = article.notes.map((n) => normalizePersian(n));
    let score = 0;

    for (const bigram of queryBigrams) {
      if (text.includes(bigram)) score += 3;
    }

    for (const term of queryTerms) {
      if (text.includes(term)) score += 2;
      if (notes.some((n) => n.includes(term))) score += 1;
    }

    const numMatch = queryTerms.find(
      (t) => /^\d+$/.test(t) && article.articleNumber === t,
    );
    if (numMatch) score += 10;

    return score;
  }
}
