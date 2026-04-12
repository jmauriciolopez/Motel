import { IsString, IsNumber, IsInt, IsOptional } from 'class-validator';

export class CrearConsumoDto {
  @IsInt()
  cantidad: number;

  @IsNumber()
  @IsOptional()
  importe?: number;

  @IsString()
  productoId: string;

  @IsString()
  turnoId: string;

  @IsString()
  motelId: string;
}
