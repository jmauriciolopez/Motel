import { IsString, IsOptional } from 'class-validator';

export class CrearProveedorDto {
  @IsString()
  nombre: string;

  @IsString()
  @IsOptional()
  nombreContacto?: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsString()
  @IsOptional()
  rubroId?: string;
}
