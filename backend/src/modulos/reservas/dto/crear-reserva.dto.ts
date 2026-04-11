import { IsString, IsDateString, IsOptional } from 'class-validator';

export class CrearReservaDto {
  @IsDateString()
  Ingreso: string;

  @IsString()
  @IsOptional()
  Estado?: string;

  @IsString()
  @IsOptional()
  Notas?: string;

  @IsString()
  habitacionId: string;

  @IsString()
  clienteId: string;

  @IsString()
  motelId: string;

  @IsString()
  @IsOptional()
  usuarioId?: string;
}
