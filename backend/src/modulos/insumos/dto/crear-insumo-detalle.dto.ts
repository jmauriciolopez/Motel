import { IsString, IsInt } from 'class-validator';

export class CrearInsumoDetalleDto {
  @IsInt()
  cantidad: number;

  @IsString()
  productoId: string;
}
