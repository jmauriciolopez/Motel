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
  @IsOptional()
  finalizada?: boolean;

  @IsString()
  motelId: string;

  @IsString()
  depositoOrigenId: string;

  @IsString()
  depositoDestinoId: string;

  @IsString()
  @IsOptional()
  usuarioId?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CrearTransferenciaDetalleDto)
  detalles?: CrearTransferenciaDetalleDto[];
}
