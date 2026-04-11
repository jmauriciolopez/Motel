import { Controller } from '@nestjs/common';
import { HabitacionesService } from './habitaciones.service';
import { BaseController } from '../../compartido/bases/base.controller';
import { Habitacion } from '@prisma/client';
import { CrearHabitacionDto } from './dto/crear-habitacion.dto';
import { ActualizarHabitacionDto } from './dto/actualizar-habitacion.dto';

@Controller('habitaciones')
export class HabitacionesController extends BaseController<Habitacion, CrearHabitacionDto, ActualizarHabitacionDto> {
  constructor(private readonly habitacionesService: HabitacionesService) {
    super(habitacionesService);
  }
}
