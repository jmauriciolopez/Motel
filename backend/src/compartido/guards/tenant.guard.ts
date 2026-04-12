import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolUsuario } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ALLOW_GLOBAL_KEY } from '../decorators/allow-global.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import {
  JwtUser,
  TenantContext,
} from '../interfaces/tenant-context.interface';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtUser | undefined;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    const allowGlobal = this.reflector.getAllAndOverride<boolean>(
      ALLOW_GLOBAL_KEY,
      [context.getHandler(), context.getClass()],
    );

    const headerTenant = this.normalizeTenantId(request.headers['x-motel-id']);
    const queryTenant = this.normalizeTenantId(request.query?.motelId);
    const requestedMotelId = headerTenant || queryTenant || null;

    const tenant = await this.resolveTenant(
      user,
      requestedMotelId,
      !!allowGlobal,
    );

    request.tenant = tenant;
    return true;
  }

  private async usuarioTieneAccesoAMotel(
    userId: string,
    motelId: string,
  ): Promise<boolean> {
    const link = await this.prisma.motelUsuario.findFirst({
      where: { usuarioId: userId, motelId },
      select: { id: true },
    });
    return !!link;
  }

  private async resolveTenant(
    user: JwtUser,
    requestedMotelId: string | null,
    allowGlobal: boolean,
  ): Promise<TenantContext> {
    const userId = user.sub ?? user.id;

    if (user.rol === RolUsuario.SUPERADMIN) {
      if (!requestedMotelId && allowGlobal) {
        return {
          motelId: null,
          scope: 'global',
          rol: user.rol,
          userId,
          propietarioId: user.propietarioId ?? null,
        };
      }

      if (!requestedMotelId && !allowGlobal) {
        throw new ForbiddenException(
          'Debe indicar x-motel-id para operar en este endpoint',
        );
      }

      return {
        motelId: requestedMotelId,
        scope: 'motel',
        rol: user.rol,
        userId,
        propietarioId: user.propietarioId ?? null,
      };
    }

    if (user.rol === RolUsuario.ADMINISTRADOR) {
      const allowedMotels = user.moteles ?? [];
      const motelId =
        requestedMotelId || user.motelId || allowedMotels[0] || null;

      if (motelId && !allowedMotels.includes(motelId)) {
        // Token desactualizado: el motel recién se vinculó en DB (onboarding) pero el JWT sigue con moteles: []
        if (await this.usuarioTieneAccesoAMotel(userId, motelId)) {
          return {
            motelId,
            scope: 'motel',
            rol: user.rol,
            userId,
            propietarioId: user.propietarioId ?? null,
          };
        }
        // x-motel-id obsoleto y aún sin moteles en token — @AllowGlobal (crear propietario/motel)
        if (allowGlobal && allowedMotels.length === 0) {
          return {
            motelId: null,
            scope: 'global',
            rol: user.rol,
            userId,
            propietarioId: user.propietarioId ?? null,
          };
        }
        throw new ForbiddenException('No tienes acceso a este motel');
      }

      if (!motelId) {
        if (allowGlobal && allowedMotels.length === 0) {
          return {
            motelId: null,
            scope: 'global',
            rol: user.rol,
            userId,
            propietarioId: user.propietarioId ?? null,
          };
        }
        throw new ForbiddenException(
          'No hay motel activo para este administrador',
        );
      }

      return {
        motelId,
        scope: 'motel',
        rol: user.rol,
        userId,
        propietarioId: user.propietarioId ?? null,
      };
    }

    if (
      user.rol === RolUsuario.SUPERVISOR ||
      user.rol === RolUsuario.RECEPCIONISTA
    ) {
      const assignedMotelId = user.motelId || user.moteles?.[0] || null;

      if (!assignedMotelId) {
        throw new ForbiddenException('Usuario sin motel asignado');
      }

      if (requestedMotelId && requestedMotelId !== assignedMotelId) {
        throw new ForbiddenException('No puedes cambiar de motel');
      }

      return {
        motelId: assignedMotelId,
        scope: 'motel',
        rol: user.rol,
        userId,
        propietarioId: user.propietarioId ?? null,
      };
    }

    throw new ForbiddenException('Rol no válido');
  }

  private normalizeTenantId(value: unknown): string | null {
    if (Array.isArray(value)) {
      return value[0] ? String(value[0]) : null;
    }

    if (value === undefined || value === null || value === '') {
      return null;
    }

    return String(value);
  }
}
