import { Controller } from '@nestjs/common';
import { ProveedoresService } from './proveedores.service';
import { BaseController } from '../../compartido/bases/base.controller';
import { Proveedor } from '@prisma/client';
import { CrearProveedorDto } from './dto/crear-proveedor.dto';
import { ActualizarProveedorDto } from './dto/actualizar-proveedor.dto';

@Controller('proveedores')
export class ProveedoresController extends BaseController<Proveedor, CrearProveedorDto, ActualizarProveedorDto> {
  constructor(private readonly proveedoresService: ProveedoresService) {
    super(proveedoresService);
  }
}
