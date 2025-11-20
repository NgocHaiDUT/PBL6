import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true,skipMissingProperties: true }));
  
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

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
