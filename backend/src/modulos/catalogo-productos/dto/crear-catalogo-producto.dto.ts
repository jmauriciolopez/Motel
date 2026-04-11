import { IsString, IsNumber, IsBoolean, IsOptional, IsInt } from 'class-validator';

export class CrearCatalogoProductoDto {
  @IsString()
  nombre: string;

  @IsNumber()
  precio: number;

  @IsNumber()
  costo: number;

  @IsBoolean()
  facturable: boolean;

  @IsInt()
  stockMinimo: number;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsString()
  @IsOptional()
  criterioBusqueda?: string;

  @IsString()
  rubroId: string;
}
