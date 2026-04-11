import { IsString, IsBoolean, IsOptional, IsDateString } from 'class-validator';

export class CrearLimpiezaDto {
  @IsBoolean()
  Finalizado: boolean;

  @IsDateString()
  Cuando: string;

  @IsString()
  @IsOptional()
  Observacion?: string;

  @IsString()
  turnoId: string;

  @IsString()
  habitacionId: string;

  @IsString()
  usuarioId: string;

  @IsString()
  motelId: string;
}
