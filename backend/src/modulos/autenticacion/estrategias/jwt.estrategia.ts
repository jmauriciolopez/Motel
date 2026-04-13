import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

const extractFromCookieOrBearer = (req: Request): string | null => {
  if (req?.cookies?.token) return req.cookies.token;
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
};

@Injectable()
export class JwtEstrategia extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: extractFromCookieOrBearer,
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'secretKey_alternativa_segura',
      passReqToCallback: false,
    });
  }

  async validate(payload: any) {
    return {
      sub: payload.sub,
      id: payload.sub,
      email: payload.email,
      rol: payload.rol,
      propietarioId: payload.propietarioId,
      moteles: payload.moteles ?? [],
      motelId: payload.motelId,
    };
  }
}
