import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { StructuredLoggerService } from './common/logger/structured-logger.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = app.get(StructuredLoggerService);
  const prismaService = app.get(PrismaService);

  // Get context logger
  const contextLogger = logger.createContextLogger('Bootstrap');

  contextLogger.log('Starting application bootstrap...');

  // ==========================================
  // Security Middlewares
  // ==========================================

  // Helmet - Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "https:"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    ieNoOpen: true,
    noSniff: true,
    permittedCrossDomainPolicies: false,
    referrerPolicy: { policy: 'same-origin' },
    xssFilter: true,
  }));
  contextLogger.log('Helmet security headers enabled');

  // Cookie Parser
  app.use(cookieParser());
  contextLogger.log('Cookie parser enabled');

  // Compression
  app.use(compression());
  contextLogger.log('Response compression enabled');

  // Rate Limiting
  const rateLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
    message: {
      statusCode: 429,
      message: 'Too many requests from this IP, please try again later.',
      error: 'RateLimitExceeded',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req: Request) => {
      // Skip rate limiting for health check
      return req.path === '/api/health';
    },
  });
  app.use(rateLimiter);
  contextLogger.log('Rate limiting enabled');

  // ==========================================
  // CORS Configuration
  // ==========================================
  app.enableCors({
    origin: process.env.ALLOW_ALL_ORIGINS === 'true'
      ? true
      : (process.env.TRUSTED_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) || []),
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400,
  });
  contextLogger.log('CORS enabled');

  // ==========================================
  // API Versioning
  // ==========================================
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  contextLogger.log('API versioning enabled');

  // ==========================================
  // Global Validation Pipe
  // ==========================================
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: process.env.NODE_ENV === 'production',
    }),
  );
  contextLogger.log('Global validation pipe enabled');

  // ==========================================
  // Global Exception Filter
  // ==========================================
  app.useGlobalFilters(new AllExceptionsFilter());
  contextLogger.log('Global exception filter enabled');

  // ==========================================
  // API Prefix
  // ==========================================
  app.setGlobalPrefix('api');
  contextLogger.log('API prefix set to /api');

  // ==========================================
  // Health Check Endpoint
  // ==========================================
  app.getHttpAdapter().get('/api/health', async (_req: Request, res: Response) => {
    try {
      const dbHealth = await prismaService.checkHealth();
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        database: dbHealth,
        version: '2.1.0',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      contextLogger.error('Health check failed', message);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: message,
      });
    }
  });
  contextLogger.log('Health check endpoint registered');

  // ==========================================
  // Swagger Documentation (only in development)
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('آیانتاراز - API Documentation')
      .setDescription('API Documentation for Ayantaraz Accounting & Tax Consultation Platform')
      .setVersion('2.1.0')
      .addBearerAuth()
      .addServer('http://localhost:3001', 'Development')
      .addServer('https://localhost:3001', 'Production')
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management endpoints')
      .addTag('content', 'Content management endpoints')
      .addTag('tax-engine', 'Tax calculation and consultation endpoints')
      .addTag('consultation', 'Consultation request endpoints')
      .addTag('orders', 'Order management endpoints')
      .addTag('courses', 'Course management endpoints')
      .addTag('admin', 'Admin endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      ignoreGlobalPrefix: false,
      deepScanRoutes: true,
    });
    SwaggerModule.setup('api/docs', app, document);
    contextLogger.log('Swagger documentation enabled at /api/docs');
  }

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');

  contextLogger.log(`Application is running on: http://0.0.0.0:${port}`);
  contextLogger.log(`Swagger docs available at: http://0.0.0.0:${port}/api/docs`);
  contextLogger.log(`Health check available at: http://0.0.0.0:${port}/api/health`);

  // Log startup information
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Ayantaraz Application Started Successfully');
  console.log('='.repeat(60));
  console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Server: http://0.0.0.0:${port}`);
  console.log(`📚 API Docs: http://0.0.0.0:${port}/api/docs`);
  console.log(`❤️ Health: http://0.0.0.0:${port}/api/health`);
  console.log('='.repeat(60) + '\n');
}

bootstrap().catch((error: unknown) => {
  console.error('❌ Bootstrap failed:', error);
  process.exit(1);
});
