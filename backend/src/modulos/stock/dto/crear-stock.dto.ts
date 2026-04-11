import { IsString, IsInt } from 'class-validator';

export class CrearStockDto {
  @IsInt()
  cantidad: number;

  @IsString()
  depositoId: string;

  @IsString()
  productoId: string;

  @IsString()
  motelId: string;
}
