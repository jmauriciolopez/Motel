import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CrearCajaDto {
  @IsString()
  Concepto: string;

  @IsNumber()
  Importe: number;

  // motelId NO viene del cliente — lo inyecta el backend desde el token
  @IsOptional()
  @IsString()
  motelId?: string;

  @IsOptional()
  createdAt?: Date;
}

export class ActualizarCajaDto {
  @IsOptional()
  @IsString()
  Concepto?: string;

  @IsOptional()
  @IsNumber()
  Importe?: number;
}
