import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import morgan from 'morgan';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('HTTP');

  app.use(morgan('combined'));

  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.log(
      `${req.method} ${req.originalUrl} origin=${req.headers.origin ?? 'none'}`,
    );
    next();
  });

  const corsOrigins = (configService.get<string>('CORS_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
    // Needed so the FE can read the download filename from StreamableFile responses.
    exposedHeaders: ['Content-Disposition', 'Content-Type'],
  });

  const swagger = new DocumentBuilder()
    .setTitle('Gym Data API')
    .setDescription('API for gym exercises data')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup('docs', app, document);

  await app.listen(configService.get<number>('PORT') ?? 3000);
}
bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
