import { Controller, Get, Headers, Query } from '@nestjs/common';
import { PagosService } from './pagos.service';
import { BaseController } from '../../compartido/bases/base.controller';
import { Pago } from '@prisma/client';
import { CrearPagoDto } from './dto/crear-pago.dto';
import { ActualizarPagoDto } from './dto/actualizar-pago.dto';

@Controller('pagos')
export class PagosController extends BaseController<Pago, CrearPagoDto, ActualizarPagoDto> {
  constructor(private readonly pagosService: PagosService) {
    super(pagosService);
  }

  @Get('discrepancias')
  obtenerDiscrepancias(
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Headers('x-motel-id') motelIdHeader?: string,
    @Query('motelId') motelIdQuery?: string,
  ) {
    const motelId = motelIdQuery || motelIdHeader;
    return this.pagosService.obtenerDiscrepancias(desde, hasta, motelId);
  }
}
