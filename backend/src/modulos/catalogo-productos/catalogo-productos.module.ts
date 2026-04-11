import { Module } from '@nestjs/common';
import { CatalogoProductosService } from './catalogo-productos.service';
import { CatalogoProductosController } from './catalogo-productos.controller';

@Module({
  controllers: [CatalogoProductosController],
  providers: [CatalogoProductosService],
  exports: [CatalogoProductosService],
})
export class CatalogoProductosModule {}
