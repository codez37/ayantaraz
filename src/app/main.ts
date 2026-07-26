import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import * as helmet from 'helmet';
import * as csurf from 'csurf';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security Middlewares
  app.use(helmet());
  app.use(cookieParser());

  // Enable CORS for production (adjust origins as needed)
  app.enableCors({
    origin: process.env.ALLOW_ALL_ORIGINS === 'true' ? true : process.env.TRUSTED_ORIGINS?.split(',') || [],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CSRF Protection (enable in production)
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_CSRF === 'true') {
    app.use(csurf({ cookie: true }));
  }

  // API Prefix
  app.setGlobalPrefix('api');

  // Swagger Documentation (only in development)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('آیان تراز - API Documentation')
      .setDescription('API Documentation for Ayantaraz Accounting & Tax Consultation Platform')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management endpoints')
      .addTag('content', 'Content management endpoints')
      .addTag('tax-engine', 'Tax calculation and consultation endpoints')
      .addTag('consultation', 'Consultation request endpoints')
      .addTag('orders', 'Order management endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger docs available at: http://localhost:${port}/api/docs`);
}

bootstrap();
