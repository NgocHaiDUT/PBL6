import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false, // Tắt body parser mặc định để config thủ công
  });

  // ✅ Raw body parser for webhooks (BEFORE other parsers)
  app.use('/webhooks', require('express').raw({ type: 'application/json', limit: '10mb' }));

  // ✅ Increase body size limit for file uploads (200MB) 
  app.use(require('express').json({ limit: '200mb' }));
  app.use(require('express').urlencoded({ limit: '200mb', extended: true }));

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true, skipMissingProperties: true }));

  // ✅ Enable CORS FIRST (before static assets)
  app.enableCors({
    origin: true, // ✅ Allow all origins for mobile development
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type,Authorization,Range', // ✅ Add Range header
    exposedHeaders: 'Content-Range,Accept-Ranges,Content-Length', // ✅ Expose video headers
  });

  // Serve static files from uploads directory
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
    setHeaders: (res, path) => {
      // Set proper MIME types for videos
      if (path.endsWith('.mp4')) {
        res.setHeader('Content-Type', 'video/mp4');
      } else if (path.endsWith('.mov')) {
        res.setHeader('Content-Type', 'video/quicktime');
      } else if (path.endsWith('.webm')) {
        res.setHeader('Content-Type', 'video/webm');
      }
      // ✅ Enable byte-range requests for video streaming (iOS requirement)
      res.setHeader('Accept-Ranges', 'bytes');
      // ✅ Add CORS headers for videos (allow all origins)
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Range');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
    },
  });

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('PBL6 API Documentation')
    .setDescription('API documentation for PBL6 E-commerce Backend')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description:
          "Use the access_token returned by POST /auth/login (paste: 'Bearer <access_token>')",
        in: 'header',
      },
      'JWT-auth',
    )
    // Apply JWT security globally so Swagger "Authorize" works across protected endpoints
    .addSecurityRequirements('JWT-auth')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 3000;
  const host = process.env.HOST ?? '0.0.0.0'; // ✅ Bind to all network interfaces for EC2
  const server = await app.listen(port, host);

  // ✅ Increase timeout for file uploads (10 minutes)
  server.setTimeout(600000); // 10 minutes for large file uploads

  Logger.log(`🚀 Application is running on: http://${host}:${port}`, 'Bootstrap');
  Logger.log(`📚 Swagger documentation: http://${host}:${port}/api`, 'Bootstrap');
}
bootstrap();
