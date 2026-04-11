import { Controller, Get, Query } from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { BaseController } from '../../compartido/bases/base.controller';
import { Cliente } from '@prisma/client';
import { CrearClienteDto } from './dto/crear-cliente.dto';
import { ActualizarClienteDto } from './dto/actualizar-cliente.dto';

@Controller('clientes')
export class ClientesController extends BaseController<Cliente, CrearClienteDto, ActualizarClienteDto> {
  constructor(private readonly clientesService: ClientesService) {
    super(clientesService);
  }

  @Get('buscar')
  buscarPorPatente(@Query('patente') patente: string, @Query('motelId') motelId: string) {
    return this.clientesService.buscarPorPatente(patente, motelId);
  }
}
