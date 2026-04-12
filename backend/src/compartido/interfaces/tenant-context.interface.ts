import { RolUsuario } from '@prisma/client';

export interface JwtUser {
  sub: string;
  id: string;
  email: string;
  rol: RolUsuario;
  propietarioId?: string | null;
  motelId?: string | null;
  moteles?: string[];
}

export interface TenantContext {
  motelId: string | null;
  scope: 'global' | 'motel';
  rol: RolUsuario;
  userId: string;
  propietarioId?: string | null;
}
