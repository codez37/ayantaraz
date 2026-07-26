import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TaxSessionStep, VALID_TRANSITIONS } from './session-state.enum';
import { TaxSession, Prisma } from '@prisma/client';

@Injectable()
export class StateManagerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StateManagerService.name);
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.cleanupTimer = setInterval(
      () => {
        this.cleanupExpiredSessions().catch((err: Error) => {
          this.logger?.error?.('Session cleanup failed', err.message);
        });
      },
      5 * 60 * 1000,
    );
  }

  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  async createSession(userId?: number): Promise<TaxSession> {
    return this.prisma.taxSession.create({
      data: {
        step: TaxSessionStep.awaiting_query as string,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        history: [] as unknown as Prisma.InputJsonValue,
        ...(userId !== undefined ? { userId } : {}),
      } as unknown as Prisma.TaxSessionCreateInput,
    });
  }

  async getSession(id: string): Promise<TaxSession | null> {
    return this.prisma.taxSession.findUnique({ where: { id } });
  }

  async getOrCreateSession(
    id?: string,
  ): Promise<{ session: TaxSession; isNew: boolean }> {
    if (id) {
      const session = await this.getSession(id);
      if (session) {
        if (!this.isExpired(session)) {
          return { session, isNew: false };
        }
        await this.resetSession(id);
      }
    }
    const newSession = await this.createSession();
    return { session: newSession, isNew: true };
  }

  async updateSession(
    id: string,
    data: Record<string, unknown>,
    expectedVersion?: number,
  ): Promise<TaxSession> {
    const where: Record<string, unknown> = { id };
    const updateData: Record<string, unknown> = {
      ...data,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    };
    if (expectedVersion !== undefined) {
      where.version = expectedVersion;
      updateData.version = { increment: 1 };
    }
    const result = await this.prisma.taxSession.updateMany({
      where,
      data: updateData,
    });
    if (result.count === 0) {
      throw new BadRequestException(
        `Session ${id} version conflict (expected ${expectedVersion})`,
      );
    }
    return (await this.getSession(id))!;
  }

  async updateStep(id: string, target: TaxSessionStep): Promise<TaxSession> {
    const session = await this.getSession(id);
    if (!session) {
      throw new BadRequestException('Session not found');
    }
    const current = session.step as TaxSessionStep;
    const allowed = VALID_TRANSITIONS[current];
    if (!allowed || !allowed.includes(target)) {
      throw new BadRequestException(
        `Invalid state transition: ${current} → ${target}`,
      );
    }
    const result = await this.prisma.taxSession.updateMany({
      where: { id, step: current, version: session.version },
      data: {
        step: target,
        version: { increment: 1 },
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
    if (result.count === 0) {
      throw new BadRequestException(
        `Session ${id} state changed before transition: ${current} → ${target}`,
      );
    }
    return (await this.getSession(id))!;
  }

  async addHistory(
    id: string,
    entry: {
      role: 'user' | 'assistant';
      content: string;
      type?: string;
    },
  ): Promise<void> {
    const session = await this.getSession(id);
    if (!session) return;
    const history = (session.history as Array<Record<string, unknown>>) || [];
    history.push({
      role: entry.role,
      content: entry.content,
      type: entry.type || null,
      timestamp: new Date().toISOString(),
    });
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    await this.updateSession(id, {
      history: history,
    });
  }

  async resetSession(id: string): Promise<TaxSession> {
    return this.updateSession(id, { step: TaxSessionStep.terminated });
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.prisma.taxSession.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }

  private isExpired(session: TaxSession): boolean {
    return session.expiresAt < new Date();
  }
}
