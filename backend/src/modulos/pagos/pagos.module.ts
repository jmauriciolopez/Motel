import { Module } from '@nestjs/common';
import { PagosService } from './pagos.service';
import { PagosController } from './pagos.controller';
import { CajasModule } from '../cajas/cajas.module';
import { TarifasModule } from '../tarifas/tarifas.module';

@Module({
  imports: [CajasModule, TarifasModule],
  controllers: [PagosController],
  providers: [PagosService],
  exports: [PagosService],
})
export class PagosModule {}

