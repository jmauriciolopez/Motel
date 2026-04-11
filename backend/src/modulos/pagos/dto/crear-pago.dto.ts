import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CrearPagoDto {
  @IsNumber()
  Importe: number;

  @IsString()
  @IsOptional()
  Referencia?: string;

  @IsString()
  formaPagoId: string;

  @IsString()
  turnoId: string;

  @IsString()
  motelId: string;
}
