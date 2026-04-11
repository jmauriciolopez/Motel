import { Controller } from '@nestjs/common';
import { ReservasService } from './reservas.service';
import { BaseController } from '../../compartido/bases/base.controller';
import { Reserva } from '@prisma/client';
import { CrearReservaDto } from './dto/crear-reserva.dto';
import { ActualizarReservaDto } from './dto/actualizar-reserva.dto';

@Controller('reservas')
export class ReservasController extends BaseController<Reserva, CrearReservaDto, ActualizarReservaDto> {
  constructor(private readonly reservasService: ReservasService) {
    super(reservasService);
  }
}
