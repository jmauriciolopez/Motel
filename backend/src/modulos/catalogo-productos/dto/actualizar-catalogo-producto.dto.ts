import { PartialType } from '@nestjs/mapped-types';
import { CrearCatalogoProductoDto } from './crear-catalogo-producto.dto';

export class ActualizarCatalogoProductoDto extends PartialType(CrearCatalogoProductoDto) {}
