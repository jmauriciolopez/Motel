import { IsString, MinLength } from 'class-validator';

export class InicioSesionDto {
  @IsString({ message: 'El identificador debe ser una cadena de texto' })
  identificador: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;
}
