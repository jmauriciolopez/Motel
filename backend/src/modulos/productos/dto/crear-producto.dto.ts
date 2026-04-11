import { IsString, IsNumber, IsBoolean, IsOptional, IsInt } from 'class-validator';

export class CrearProductoDto {
  @IsString()
  Nombre: string;

  @IsNumber()
  Precio: number;

  @IsNumber()
  Costo: number;

  @IsBoolean()
  Facturable: boolean;

  @IsInt()
  StockMinimo: number;

  @IsBoolean()
  EsComun: boolean;

  @IsString()
  @IsOptional()
  CriterioBusqueda?: string;

  @IsString()
  rubroId: string;

  @IsString()
  motelId: string;

  @IsString()
  @IsOptional()
  catalogoProductoId?: string;
}
