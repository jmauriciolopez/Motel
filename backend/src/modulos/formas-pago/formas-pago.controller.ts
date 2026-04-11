import { Controller } from '@nestjs/common';
import { FormasPagoService } from './formas-pago.service';
import { BaseController } from '../../compartido/bases/base.controller';
import { FormaPago } from '@prisma/client';
import { CrearFormaPagoDto } from './dto/crear-forma-pago.dto';
import { ActualizarFormaPagoDto } from './dto/actualizar-forma-pago.dto';

@Controller('formas-pago')
export class FormasPagoController extends BaseController<FormaPago, CrearFormaPagoDto, ActualizarFormaPagoDto> {
  constructor(private readonly formasPagoService: FormasPagoService) {
    super(formasPagoService);
  }
}
