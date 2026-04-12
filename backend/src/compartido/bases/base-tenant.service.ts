import { NotFoundException } from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { TenantContext } from '../interfaces/tenant-context.interface';

export abstract class BaseTenantService {
  protected buildTenantWhere(
    tenant: TenantContext,
    extraWhere: Record<string, unknown> = {},
  ): Record<string, unknown> {
    if (tenant.rol === RolUsuario.SUPERADMIN && tenant.scope === 'global') {
      return { ...extraWhere };
    }

    return {
      ...extraWhere,
      motelId: tenant.motelId,
    };
  }

  protected ensureTenantRecord<T>(
    record: T | null | undefined,
    message = 'Registro no encontrado',
  ): T {
    if (!record) {
      throw new NotFoundException(message);
    }

    return record;
  }
}
