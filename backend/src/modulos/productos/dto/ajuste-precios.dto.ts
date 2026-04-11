import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum } from 'class-validator';

export class AjustePreciosDto {
  @IsEnum(['Precio', 'Costo', 'ambos'])
  campo: string;

  @IsNumber()
  porcentaje: number;

  @IsNumber()
  redondeo: number;

  @IsOptional()
  @IsString()
  filtroRubroId?: string;

  @IsOptional()
  @IsBoolean()
  filtroFacturable?: boolean;
}
