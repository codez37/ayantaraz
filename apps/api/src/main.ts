import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { RequestLoggerInterceptor } from './common/interceptors/request-logger.interceptor';
import { JsonLogger } from './common/logger/json-logger.service';
import { PrismaService } from './prisma/prisma.service';

const logger = new JsonLogger();

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function waitForDatabase(prisma: PrismaService, retries = 10) {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      logger.log('Database connection established', 'Bootstrap');
      return;
    } catch (err) {
      logger.error(
        `DB not ready (attempt ${i + 1}/${retries})`,
        err instanceof Error ? err.stack : undefined,
        'Bootstrap',
      );
      const delay = Math.min(
        1000 * Math.pow(2, i) + Math.random() * 100,
        10000
      );
      await sleep(delay);
    }
  }
  throw new Error('Database unreachable after retries');
}

let isShuttingDown = false;

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger,
    forceCloseConnections: true,
  });

  const isProduction = process.env.NODE_ENV === 'production';
  app.set('trust proxy', isProduction ? 1 : 0);

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
    maxAge: isProduction ? 7 * 24 * 60 * 60 * 1000 : 0,
  });

  app.use(cookieParser());

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:', 'http:'],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
      hsts: {
        maxAge: isProduction ? 63072000 : 0,
        includeSubDomains: true,
        preload: isProduction,
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'same-origin' },
      xContentTypeOptions: true,
      xFrameOptions: { action: 'deny' },
      xXssProtection: true,
    }),
  );

  const allowAllOrigins = process.env.ALLOW_ALL_ORIGINS === 'true';
  const corsOrigin = (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    if (!origin) return callback(null, true);
    if (allowAllOrigins) return callback(null, true);
    if (
      /^https?:\/\/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|localhost|127\.0\.0\.1)(:\d+)?$/i.test(
        origin,
      )
    ) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked: ${origin}`), false);
  };

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'X-API-Key',
      'X-CSRF-Token',
    ],
    exposedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 3600,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new RequestLoggerInterceptor());
  app.setGlobalPrefix('api', { exclude: ['health'] });

  const port = Number(process.env.PORT || 3001);
  const prisma = app.get(PrismaService);
  await waitForDatabase(prisma);

  const server = await app.listen(port, '0.0.0.0');
  server.keepAliveTimeout = 70_000;
  server.headersTimeout = 75_000;

  logger.log(`API running on 0.0.0.0:${port}`, 'Bootstrap');

  const shutdown = async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    const forceKill = setTimeout(() => {
      logger.error('Force shutdown', undefined, 'Bootstrap');
      process.exit(1);
    }, 20000);
    try {
      await new Promise<void>((resolve) =>
        server.close(() => {
          logger.log('HTTP server closed', 'Bootstrap');
          resolve();
        }),
      );
      await new Promise((resolve) => setTimeout(resolve, 500));
      await app.close();
      await prisma.$disconnect();
      clearTimeout(forceKill);
      process.exit(0);
    } catch (err) {
      logger.error(
        'Shutdown failed',
        err instanceof Error ? err.stack : undefined,
        'Bootstrap',
      );
      // Keep forceKill watchdog active during recovery disconnect
      // Race the cleanup against the existing 20-second watchdog
      try {
        await prisma.$disconnect();
      } catch (disconnectErr) {
        logger.error(
          'Prisma disconnect error during shutdown',
          disconnectErr instanceof Error ? disconnectErr.stack : undefined,
          'Bootstrap',
        );
      }
      // forceKill timeout is still active - will trigger if we don't exit
      clearTimeout(forceKill);
      process.exit(1);
    }
  };

  ['SIGTERM', 'SIGINT'].forEach((sig) =>
    process.on(sig, () => void shutdown()),
  );
  process.on('unhandledRejection', (reason: unknown) => {
    const errorMessage =
      reason instanceof Error ? reason.stack || reason.message : String(reason);
    logger.error('Unhandled Rejection', errorMessage, 'Bootstrap');
  });
  process.on('uncaughtException', (err: Error) => {
    logger.error('Uncaught Exception', err.stack, 'Bootstrap');
    process.exit(1);
  });
}

void (async () => {
  try {
    await bootstrap();
  } catch (err) {
    logger.error(
      'Bootstrap failed',
      err instanceof Error ? err.stack : undefined,
      'Bootstrap',
    );
    process.exit(1);
  }
})();
