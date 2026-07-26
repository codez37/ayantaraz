import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  constructor(private prisma: PrismaService) {}

  async create(
    userId: number,
    tokenId: string,
    ipAddress?: string,
    deviceInfo?: string,
  ) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    const session = await this.prisma.session.create({
      data: { userId, tokenId, ipAddress, deviceInfo, expiresAt },
    });
    this.logger.debug(
      `Session created: userId=${userId}, tokenId=${tokenId.substring(0, 8)}...`,
    );
    return session;
  }

  async revokeAll(userId: number) {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    this.logger.log(`All sessions revoked for user: ${userId}`);
  }

  async revokeById(id: number) {
    await this.prisma.session.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    this.logger.debug(`Session revoked: ${id}`);
  }

  async getActiveSession(userId: number) {
    return this.prisma.session.findFirst({
      where: { userId, revokedAt: null, expiresAt: { gte: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSessionByTokenId(tokenId: string) {
    return this.prisma.session.findFirst({
      where: { tokenId, revokedAt: null, expiresAt: { gte: new Date() } },
      include: { user: { select: { id: true, phone: true, role: true } } },
    });
  }

  async isTokenValid(tokenId: string): Promise<boolean> {
    try {
      const session = await this.getSessionByTokenId(tokenId);
      return session !== null;
    } catch (error) {
      this.logger.error(
        `Failed to check token: ${error instanceof Error ? error.message : String(error)}`,
      );
      return true;
    }
  }

  async getAllActiveSessions(userId: number) {
    return this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gte: new Date() } },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, phone: true } } },
    });
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: { revokedAt: null, expiresAt: { lt: new Date() } },
      data: { revokedAt: new Date() },
    });
    if (result.count > 0)
      this.logger.log(`Cleaned up ${result.count} expired sessions`);
    return result.count;
  }
}
