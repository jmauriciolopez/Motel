import { Module } from '@nestjs/common';
import { RubrosService } from './rubros.service';
import { RubrosController } from './rubros.controller';

@Module({
  controllers: [RubrosController],
  providers: [RubrosService],
  exports: [RubrosService],
})
export class RubrosModule {}
