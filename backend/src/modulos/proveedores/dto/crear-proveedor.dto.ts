import { IsString, IsOptional } from 'class-validator';

export class CrearProveedorDto {
  @IsString()
  Nombre: string;

  @IsString()
  @IsOptional()
  NombreContacto?: string;

  @IsString()
  @IsOptional()
  Telefono?: string;

  @IsString()
  @IsOptional()
  rubroId?: string;
}
