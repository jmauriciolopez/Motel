import { IsString, IsInt, Min } from 'class-validator';

export class CrearTransferenciaDetalleRecursoDto {
  @IsString()
  transferenciaId: string;

  @IsString()
  productoId: string;

  @IsInt()
  @Min(1)
  cantidad: number;

  @IsString()
  motelId: string;
}
