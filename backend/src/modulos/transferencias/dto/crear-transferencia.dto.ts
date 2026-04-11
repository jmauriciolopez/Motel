import { IsString, IsBoolean, IsOptional, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CrearTransferenciaDetalleDto } from './crear-transferencia-detalle.dto';

export class CrearTransferenciaDto {
  @IsDateString()
  fecha: string;

  @IsString()
  @IsOptional()
  observacion?: string;

  @IsBoolean()
  finalizada: boolean;

  @IsString()
  motelId: string;

  @IsString()
  depositoOrigenId: string;

  @IsString()
  depositoDestinoId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrearTransferenciaDetalleDto)
  detalles: CrearTransferenciaDetalleDto[];
}
