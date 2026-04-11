import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CrearClienteDto {
  @IsString()
  Patente: string;

  @IsString()
  @IsOptional()
  Marca?: string;

  @IsString()
  @IsOptional()
  Color?: string;

  @IsString()
  @IsOptional()
  movilidadId?: string;

  @IsString()
  motelId: string;
}
