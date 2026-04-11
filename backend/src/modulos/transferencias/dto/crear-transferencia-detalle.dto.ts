import { IsString, IsInt } from 'class-validator';

export class CrearTransferenciaDetalleDto {
  @IsInt()
  cantidad: number;

  @IsString()
  productoId: string;
}
