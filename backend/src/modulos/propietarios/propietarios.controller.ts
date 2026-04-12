import { Controller } from '@nestjs/common';
import { PropietariosService } from './propietarios.service';
import { BaseController } from '../../compartido/bases/base.controller';
import { Propietario } from '@prisma/client';
import { CrearPropietarioDto } from './dto/crear-propietario.dto';
import { ActualizarPropietarioDto } from './dto/actualizar-propietario.dto';
import { AllowGlobal } from '../../compartido/decorators/allow-global.decorator';

@Controller('propietarios')
@AllowGlobal()
export class PropietariosController extends BaseController<Propietario, CrearPropietarioDto, ActualizarPropietarioDto> {
  constructor(private readonly propietariosService: PropietariosService) {
    super(propietariosService);
  }
}
