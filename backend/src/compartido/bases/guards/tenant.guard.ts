import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    const motelIdHeader = request.headers['x-motel-id'];
    const motelIdQuery = request.query?.motelId;

    const motelId = motelIdHeader || motelIdQuery || user.motelId;

    if (!motelId) {
      throw new ForbiddenException('Tenant no definido');
    }

    // validar pertenencia
    if (user.moteles && !user.moteles.includes(motelId)) {
      throw new ForbiddenException('No tienes acceso a este motel');
    }

    // inyectar tenant resuelto
    request.tenant = {
      motelId,
    };

    return true;
  }
}