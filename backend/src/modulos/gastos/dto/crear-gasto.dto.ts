import { IsString, IsNumber } from 'class-validator';

export class CrearGastoDto {
  @IsString()
  concepto: string;

  @IsNumber()
  importe: number;

  @IsString()
  motelId: string;
}
