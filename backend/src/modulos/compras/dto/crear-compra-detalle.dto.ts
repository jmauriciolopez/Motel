import { IsString, IsNumber, IsInt } from 'class-validator';

export class CrearCompraDetalleDto {
  @IsInt()
  cantidad: number;

  @IsNumber()
  precio: number;

  @IsNumber()
  importe: number;

  @IsString()
  productoId: string;
}
