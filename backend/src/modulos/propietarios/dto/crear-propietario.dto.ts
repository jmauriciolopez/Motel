import { IsString, IsEmail, IsOptional, IsBoolean } from 'class-validator';

export class CrearPropietarioDto {
  @IsString()
  Nombre: string;

  @IsEmail()
  Email: string;

  @IsString()
  @IsOptional()
  Telefono?: string;

  @IsString()
  @IsOptional()
  Cuit?: string;

  @IsString()
  @IsOptional()
  Ciudad?: string;

  @IsString()
  @IsOptional()
  FormaPago?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString({ each: true })
  @IsOptional()
  motelIds?: string[];

  @IsBoolean()
  @IsOptional()
  Activo?: boolean;

  @IsBoolean()
  @IsOptional()
  PagoActivo?: boolean;
}
