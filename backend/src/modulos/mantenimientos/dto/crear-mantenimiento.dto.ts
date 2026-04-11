import { IsString, IsBoolean, IsOptional, IsDateString } from 'class-validator';

export class CrearMantenimientoDto {
  @IsDateString()
  cuando: string;

  @IsString()
  @IsOptional()
  observacion?: string;

  @IsBoolean()
  finalizado: boolean;

  @IsString()
  habitacionId: string;

  @IsString()
  @IsOptional()
  proveedorId?: string;

  @IsString()
  usuarioId: string;

  @IsString()
  motelId: string;
}
