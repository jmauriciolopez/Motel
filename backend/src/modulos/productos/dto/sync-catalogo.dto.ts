import { IsString, IsArray, ArrayMinSize } from 'class-validator';

export class SyncCatalogoDto {
  @IsString()
  motelId: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  catalogoIds: string[];
}
