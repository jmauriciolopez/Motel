import { IsString, IsBoolean } from 'class-validator';

export class CrearDepositoDto {
  @IsString()
  Nombre: string;

  @IsBoolean()
  EsPrincipal: boolean;

  @IsString()
  motelId: string;
}
