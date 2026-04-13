import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AutenticacionService } from './autenticacion.service';
import { AutenticacionController } from './autenticacion.controller';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { JwtEstrategia } from './estrategias/jwt.estrategia';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    UsuariosModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secretKey_alternativa_segura',
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as any },
    }),
  ],
  controllers: [AutenticacionController],
  providers: [AutenticacionService, JwtEstrategia, JwtAuthGuard],
  exports: [AutenticacionService, JwtAuthGuard],
})
export class AutenticacionModule {}
