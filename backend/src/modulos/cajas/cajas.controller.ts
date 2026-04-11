import { Controller } from '@nestjs/common';
import { CajasService } from './cajas.service';
import { BaseController } from '../../compartido/bases/base.controller';
import { Caja } from '@prisma/client';
import { CrearCajaDto, ActualizarCajaDto } from './dto/cajas.dto';

@Controller('cajas')
export class CajasController extends BaseController<Caja, CrearCajaDto, ActualizarCajaDto> {
  constructor(private readonly cajasService: CajasService) {
    super(cajasService);
  }
}
