import { Controller } from '@nestjs/common';
import { TransferenciasService } from './transferencias.service';
import { BaseController } from '../../compartido/bases/base.controller';
import { Transferencia } from '@prisma/client';
import { CrearTransferenciaDto } from './dto/crear-transferencia.dto';
import { ActualizarTransferenciaDto } from './dto/actualizar-transferencia.dto';

@Controller('transferencias')
export class TransferenciasController extends BaseController<Transferencia, CrearTransferenciaDto, ActualizarTransferenciaDto> {
  constructor(private readonly transferenciasService: TransferenciasService) {
    super(transferenciasService);
  }
}
