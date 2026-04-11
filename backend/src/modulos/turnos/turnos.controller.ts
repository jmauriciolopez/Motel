import { Controller, Post, Body, Param } from '@nestjs/common';
import { TurnosService } from './turnos.service';
import { BaseController } from '../../compartido/bases/base.controller';
import { Turno } from '@prisma/client';
import { CrearTurnoDto } from './dto/crear-turno.dto';
import { ActualizarTurnoDto } from './dto/actualizar-turno.dto';

@Controller('turnos')
export class TurnosController extends BaseController<Turno, CrearTurnoDto, ActualizarTurnoDto> {
  constructor(private readonly turnosService: TurnosService) {
    super(turnosService);
  }

  @Post('abrir')
  abrir(@Body() crearTurnoDto: CrearTurnoDto) {
    return this.turnosService.abrirTurno(crearTurnoDto);
  }

  @Post(':id/cerrar')
  cerrar(
    @Param('id') id: string, 
    @Body('usuarioCierreId') usuarioCierreId: string,
    @Body('formaPagoId') formaPagoId?: string,
  ) {
    return this.turnosService.cerrarTurno(id, usuarioCierreId, formaPagoId);
  }
}
