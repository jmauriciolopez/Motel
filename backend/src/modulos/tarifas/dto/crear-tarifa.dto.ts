import { IsString, IsNumber, IsOptional, IsInt, Min } from 'class-validator';

export class CrearTarifaDto {
  @IsString()
  Nombre: string;

  @IsNumber()
  PrecioTurno: number;

  @IsNumber()
  PrecioDiario: number;

  @IsNumber()
  @IsOptional()
  PrecioTurnoPromocional?: number;

  @IsNumber()
  PrecioHrDiaExcede: number;

  @IsNumber()
  PrecioHrNocheExcede: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  MinutosExtra?: number;

  @IsString()
  motelId: string;
}
