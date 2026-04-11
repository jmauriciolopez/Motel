import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CrearHabitacionDto {
  @IsString()
  Identificador: string;

  @IsString()
  @IsOptional()
  Nombre?: string;

  @IsBoolean()
  @IsOptional()
  Activa?: boolean;

  @IsString()
  Estado: any; 

  @IsString()
  @IsOptional()
  tarifaId?: string;

  @IsString()
  motelId: string;
}
