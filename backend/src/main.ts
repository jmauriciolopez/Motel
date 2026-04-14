import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT ?? 3000;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
  const apiPrefix = process.env.API_PREFIX || 'api/v1';

  console.log('=== CONFIG ===');
  console.log(`FRONTEND_URL : ${frontendUrl}`);
  console.log(`API_PREFIX   : ${apiPrefix}`);
  console.log(`PORT         : ${port}`);
  console.log('==============');

  app.use(cookieParser());

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'same-site' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", frontendUrl],
      },
    },
  }));

  const allowedOrigins = frontendUrl.split(',').map(o => o.trim());

  app.enableCors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.setGlobalPrefix(apiPrefix);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}/${apiPrefix}`);
}
bootstrap();
