import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtEstrategia extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'secretKey_alternativa_segura',
    });
  }

  async validate(payload: any) {
    return {
      id: payload.sub,
      email: payload.email,
      rol: payload.rol,
      propietarioId: payload.propietarioId,
      moteles: payload.moteles,       // array de IDs de moteles autorizados
      motelId: payload.motelId,       // motel activo (primero de la lista)
    };
  }
}
