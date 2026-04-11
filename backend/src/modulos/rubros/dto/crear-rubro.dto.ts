import { IsString, IsBoolean } from 'class-validator';

export class CrearRubroDto {
  @IsString()
  Nombre: string;

  @IsBoolean()
  Facturable: boolean;

  @IsBoolean()
  EsMaestro: boolean;

  @IsString()
  motelId: string;
}
