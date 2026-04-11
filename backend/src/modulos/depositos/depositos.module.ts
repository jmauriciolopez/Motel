import { Module } from '@nestjs/common';
import { DepositosService } from './depositos.service';
import { DepositosController } from './depositos.controller';

@Module({
  controllers: [DepositosController],
  providers: [DepositosService],
  exports: [DepositosService],
})
export class DepositosModule {}
