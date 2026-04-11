import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from './modulos/autenticacion/guards/jwt-auth.guard';
import { TenantGuard } from './compartido/bases/guards/tenant.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilitar CORS con soporte para credenciales (necesario para el frontend)
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
app.useGlobalGuards(
  new JwtAuthGuard(reflector),
  new TenantGuard(),
);
  // Configurar prefijo global para coincidir con el frontend
  app.setGlobalPrefix('api');

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
