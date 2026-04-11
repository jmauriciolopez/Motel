import { IsString, IsNumber, IsInt } from 'class-validator';

export class CrearConsumoDto {
  @IsInt()
  cantidad: number;

  @IsNumber()
  importe: number;

  @IsString()
  productoId: string;

  @IsString()
  turnoId: string;

  @IsString()
  motelId: string;
}
