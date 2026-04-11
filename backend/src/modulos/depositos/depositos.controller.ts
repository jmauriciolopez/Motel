import { Controller } from '@nestjs/common';
import { DepositosService } from './depositos.service';
import { BaseController } from '../../compartido/bases/base.controller';
import { Deposito } from '@prisma/client';
import { CrearDepositoDto } from './dto/crear-deposito.dto';
import { ActualizarDepositoDto } from './dto/actualizar-deposito.dto';

@Controller('depositos')
export class DepositosController extends BaseController<Deposito, CrearDepositoDto, ActualizarDepositoDto> {
  constructor(private readonly depositosService: DepositosService) {
    super(depositosService);
  }
}
