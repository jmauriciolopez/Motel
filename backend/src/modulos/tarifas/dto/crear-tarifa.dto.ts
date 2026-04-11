import { IsString, IsNumber, IsOptional } from 'class-validator';

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

  @IsString()
  motelId: string;
}
