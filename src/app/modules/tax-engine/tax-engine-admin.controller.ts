import * as crypto from 'crypto';
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  Prisma,
  UserRole,
  TaxBook,
  TaxCategory,
  BracketType,
} from '@prisma/client';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { CreateBracketDto } from './dto/create-bracket.dto';
import { UpdateBracketDto } from './dto/update-bracket.dto';
import { PaginationDto } from './dto/pagination.dto';

(BigInt.prototype as unknown as Record<string, unknown>).toJSON = function () {
  return Number(this);
};

@Controller('tax-engine/admin')
@Roles(UserRole.admin)
export class TaxEngineAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('articles')
  async listArticles(
    @Query() pagination: PaginationDto,
    @Query('category') category?: string,
    @Query('book') book?: string,
  ) {
    const { page, limit } = pagination;
    const where: Record<string, unknown> = {};
    if (
      category &&
      Object.values(TaxCategory).includes(category as TaxCategory)
    ) {
      where.category = category;
    }
    if (book && Object.values(TaxBook).includes(book as TaxBook)) {
      where.book = book;
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.taxArticle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.taxArticle.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  @Get('articles/:id')
  async getArticle(@Param('id', ParseIntPipe) id: number) {
    const article = await this.prisma.taxArticle.findUnique({ where: { id } });
    if (!article) {
      throw new NotFoundException('Article not found');
    }
    return article;
  }

  @Post('articles')
  async createArticle(@Body() dto: CreateArticleDto) {
    return this.prisma.taxArticle.create({
      data: {
        articleNumber: dto.articleNumber,
        text: dto.text,
        notes: dto.notes ?? [],
        chapterTitle: dto.chapterTitle ?? '',
        book: dto.book,
        category: dto.category ?? null,
        validFrom: new Date(dto.validFrom),
        validTo: dto.validTo ? new Date(dto.validTo) : null,
        snapshotId: crypto.randomUUID(),
        isLatest: true,
      },
    });
  }

  @Patch('articles/:id')
  async updateArticle(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateArticleDto,
  ) {
    const existing = await this.prisma.taxArticle.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Article not found');
    }

    const data: Record<string, unknown> = {};
    if (dto.articleNumber !== undefined) data.articleNumber = dto.articleNumber;
    if (dto.text !== undefined) data.text = dto.text;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.chapterTitle !== undefined) data.chapterTitle = dto.chapterTitle;
    if (dto.book !== undefined) data.book = dto.book;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.validFrom !== undefined) data.validFrom = new Date(dto.validFrom);
    if (dto.validTo !== undefined)
      data.validTo = dto.validTo ? new Date(dto.validTo) : null;

    return this.prisma.taxArticle.update({ where: { id }, data });
  }

  @Delete('articles/:id')
  async deleteArticle(@Param('id', ParseIntPipe) id: number) {
    const existing = await this.prisma.taxArticle.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Article not found');
    }

    return this.prisma.taxArticle.update({
      where: { id },
      data: { validTo: new Date() },
    });
  }

  @Get('rules')
  async listRules(
    @Query() pagination: PaginationDto,
    @Query('type') type?: string,
  ) {
    const { page, limit } = pagination;
    const where: Record<string, unknown> = {};
    if (type && Object.values(BracketType).includes(type as BracketType)) {
      where.type = type;
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.taxRule.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.taxRule.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  @Post('rules')
  async createRule(@Body() dto: CreateRuleDto) {
    return this.prisma.taxRule.create({
      data: {
        type: dto.type,
        ruleKey: dto.ruleKey,
        description: dto.description ?? '',
        condition: dto.condition as Prisma.InputJsonValue,
        action: dto.action as Prisma.InputJsonValue,
        priority: dto.priority ?? 0,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  @Patch('rules/:id')
  async updateRule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRuleDto,
  ) {
    const existing = await this.prisma.taxRule.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Rule not found');
    }

    const data: Record<string, unknown> = {};
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.ruleKey !== undefined) data.ruleKey = dto.ruleKey;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.condition !== undefined) data.condition = dto.condition;
    if (dto.action !== undefined) data.action = dto.action;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.effectiveFrom !== undefined)
      data.effectiveFrom = new Date(dto.effectiveFrom);
    if (dto.effectiveTo !== undefined)
      data.effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.taxRule.update({ where: { id }, data });
  }

  @Delete('rules/:id')
  async deleteRule(@Param('id', ParseIntPipe) id: number) {
    const existing = await this.prisma.taxRule.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Rule not found');
    }

    return this.prisma.taxRule.update({
      where: { id },
      data: { isActive: false, effectiveTo: new Date() },
    });
  }

  @Get('brackets')
  async listBrackets(
    @Query() pagination: PaginationDto,
    @Query('year') year?: string,
    @Query('type') type?: string,
  ) {
    const { page, limit } = pagination;
    const where: Record<string, unknown> = {};
    if (year) {
      where.year = parseInt(year, 10);
    }
    if (type && Object.values(BracketType).includes(type as BracketType)) {
      where.type = type;
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.taxBracket.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ year: 'desc' }, { bracketOrder: 'asc' }],
      }),
      this.prisma.taxBracket.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  @Post('brackets')
  async createBracket(@Body() dto: CreateBracketDto) {
    return this.prisma.taxBracket.create({
      data: {
        year: dto.year,
        type: dto.type,
        bracketOrder: dto.bracketOrder,
        minAmount: dto.minAmount,
        maxAmount: dto.maxAmount ?? null,
        rate: dto.rate,
        description: dto.description ?? '',
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  @Patch('brackets/:id')
  async updateBracket(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBracketDto,
  ) {
    const existing = await this.prisma.taxBracket.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Bracket not found');
    }

    const data: Record<string, unknown> = {};
    if (dto.year !== undefined) data.year = dto.year;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.bracketOrder !== undefined) data.bracketOrder = dto.bracketOrder;
    if (dto.minAmount !== undefined) data.minAmount = dto.minAmount;
    if (dto.maxAmount !== undefined) data.maxAmount = dto.maxAmount;
    if (dto.rate !== undefined) data.rate = dto.rate;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.metadata !== undefined) data.metadata = dto.metadata;

    return this.prisma.taxBracket.update({ where: { id }, data });
  }
}
