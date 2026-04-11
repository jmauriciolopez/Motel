import { IsString, IsEmail, IsOptional, IsBoolean } from 'class-validator';

export class CrearUsuarioDto {
  @IsString()
  Username: string;

  @IsEmail()
  Email: string;

  @IsString()
  Password: string;

  @IsString()
  @IsOptional()
  propietarioId?: string;

  @IsBoolean()
  @IsOptional()
  Confirmed?: boolean;

  @IsBoolean()
  @IsOptional()
  Blocked?: boolean;

  @IsString()
  @IsOptional()
  Rol?: string;

  @IsString()
  @IsOptional()
  motelId?: string;
}
