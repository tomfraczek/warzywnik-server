import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import * as express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

type RequestWithRawBody = Request & { rawBody?: string };

async function bootstrap() {
  /**
   * 🔴 KLUCZOWE
   * Wyłączamy domyślny body-parser NestJS,
   * bo w Twoim setupie coś konsumuje body zanim trafi do controllera
   */
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  /**
   * ✅ Jedyny parser JSON w aplikacji
   * + przechwytujemy RAW BODY do debugowania
   */
  const jsonParser = express.json({
    limit: '10mb',
    verify: (req, _res, buf) => {
      const r = req as RequestWithRawBody;
      r.rawBody = buf.toString('utf8');
    },
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    jsonParser(req, res, (err?: unknown) => {
      if (err) {
        const r = req as RequestWithRawBody;

        if (req.method === 'PATCH' && req.url.startsWith('/v1/vegetables/')) {
          console.log('================ JSON PARSE ERROR ================');
          console.log('PID:', process.pid);
          console.log('URL:', req.url);
          console.log('Content-Type:', req.headers['content-type']);
          console.log('Raw body (first 300 chars):');
          console.log((r.rawBody ?? '').slice(0, 300));
          console.log('Error:', err);
          console.log('==================================================');
        }

        return next(err);
      }

      next();
    });
  });

  /**
   * Static uploads
   */
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

  /**
   * CORS – frontend (Next) na 3000
   */
  app.enableCors({
    origin: 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Authorization, X-Admin-Token',
    credentials: true,
  });

  /**
   * Swagger
   */
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Warzywnik API')
    .setDescription('Backend API')
    .setVersion('1.0')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  /**
   * 🚀 START
   */
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, '0.0.0.0');

  console.log(`[BOOT] pid=${process.pid} port=${port}`);
}

void bootstrap();
