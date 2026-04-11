import { IsString, IsOptional, IsBoolean, IsInt, IsDateString } from 'class-validator';

export class CrearMotelDto {
  @IsString()
  Nombre: string;

  @IsString()
  @IsOptional()
  Direccion?: string;

  @IsString()
  @IsOptional()
  Telefono?: string;

  @IsBoolean()
  @IsOptional()
  HorarioUnico?: boolean;

  @IsDateString()
  @IsOptional()
  InicioDia?: string;

  @IsDateString()
  @IsOptional()
  InicioNoche?: string;

  @IsDateString()
  @IsOptional()
  CheckOutDia?: string;

  @IsInt()
  @IsOptional()
  Tolerancia?: number;

  @IsInt()
  @IsOptional()
  DuracionDiaria?: number;

  @IsInt()
  @IsOptional()
  DuracionNocturna?: number;

  @IsInt()
  @IsOptional()
  MaxHrAdicional?: number;

  @IsString()
  @IsOptional()
  HoraCierreCaja?: string;

  @IsBoolean()
  @IsOptional()
  OnboardingCompleto?: boolean;

  @IsString()
  propietarioId: string;

  @IsString({ each: true })
  @IsOptional()
  userIds?: string[];
}
