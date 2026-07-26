import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import * as helmet from 'helmet';
import * as csurf from 'csurf';
import * as compression from 'compression';
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

  // Security Middlewares
  app.use(helmet());
  app.use(cookieParser());
  app.use(compression());

  // CSRF Protection (enable in production)
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_CSRF === 'true') {
    app.use(csurf({ cookie: true }));
    contextLogger.log('CSRF protection enabled');
  }

  // Enable CORS
  app.enableCors({
    origin: process.env.ALLOW_ALL_ORIGINS === 'true' 
      ? true 
      : process.env.TRUSTED_ORIGINS?.split(',') || [],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400,
  });
  contextLogger.log('CORS enabled');

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  contextLogger.log('API versioning enabled');

  // Global Validation Pipe
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

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter(logger));
  contextLogger.log('Global exception filter enabled');

  // API Prefix
  app.setGlobalPrefix('api');
  contextLogger.log('API prefix set to /api');

  // Health Check Endpoint
  app.getHttpAdapter().get('/api/health', async (req, res) => {
    try {
      const dbHealth = await prismaService.checkHealth();
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        database: dbHealth,
        version: '2.0.0',
      });
    } catch (error) {
      contextLogger.error('Health check failed', error.message);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  });
  contextLogger.log('Health check endpoint registered');

  // Swagger Documentation (only in development)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('آیان تراز - API Documentation')
      .setDescription('API Documentation for Ayantaraz Accounting & Tax Consultation Platform')
      .setVersion('2.0.0')
      .addBearerAuth()
      .addServer('http://localhost:3001', 'Development')
      .addServer('http://202.133.91.13:3001', 'Production')
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
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Server: http://0.0.0.0:${port}`);
  console.log(`📖 API Docs: http://0.0.0.0:${port}/api/docs`);
  console.log(`🔍 Health: http://0.0.0.0:${port}/api/health`);
  console.log('='.repeat(60) + '\n');
}

bootstrap().catch((error) => {
  console.error('❌ Bootstrap failed:', error);
  process.exit(1);
});
