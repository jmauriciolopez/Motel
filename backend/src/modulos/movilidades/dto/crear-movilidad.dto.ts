import { IsString } from 'class-validator';

export class CrearMovilidadDto {
  @IsString()
  tipo: string;
}
