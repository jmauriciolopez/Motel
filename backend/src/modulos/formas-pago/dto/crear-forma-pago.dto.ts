import { IsString } from 'class-validator';

export class CrearFormaPagoDto {
  @IsString()
  tipo: string;
}
