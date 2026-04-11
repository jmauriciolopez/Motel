import { IsString, IsInt, IsDateString, IsNumber, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { TipoEstadia } from '@prisma/client';

export class CrearTurnoDto {
  @IsDateString()
  @IsOptional()
  Ingreso?: string;

  @IsDateString()
  @IsOptional()
  Salida?: string;

  @IsNumber()
  @IsOptional()
  Total?: number;

  @IsString()
  @IsOptional()
  Estado?: string;

  @IsString()
  @IsOptional()
  Observacion?: string;

  @IsString()
  @IsOptional()
  ObservacionSecundaria?: string;

  @IsInt()
  @IsOptional()
  Precio?: number;

  @IsBoolean()
  @IsOptional()
  PagoPendiente?: boolean;

  @IsEnum(TipoEstadia)
  @IsOptional()
  TipoEstadia?: TipoEstadia;

  @IsString()
  habitacionId: string;

  @IsString()
  @IsOptional()
  tarifaId?: string;

  @IsString()
  clienteId: string;

  @IsString()
  usuarioAperturaId: string;

  @IsString()
  @IsOptional()
  usuarioCierreId?: string;
}
