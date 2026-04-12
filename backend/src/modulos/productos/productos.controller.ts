import { Controller, Post, Body, Get, Headers, Query, UseGuards } from '@nestjs/common';
import { ProductosService } from './productos.service';
import { BaseController } from '../../compartido/bases/base.controller';
import { Producto } from '@prisma/client';
import { CrearProductoDto } from './dto/crear-producto.dto';
import { ActualizarProductoDto } from './dto/actualizar-producto.dto';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';
import { SyncCatalogoDto } from './dto/sync-catalogo.dto';
import { AjustePreciosDto } from './dto/ajuste-precios.dto';

@Controller('productos')
export class ProductosController extends BaseController<Producto, CrearProductoDto, ActualizarProductoDto> {
  constructor(private readonly productosService: ProductosService) {
    super(productosService);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sync-catalogo')
  syncCatalogo(@Body() body: SyncCatalogoDto) {
    return this.productosService.syncCatalogo(body.motelId, body.catalogoIds);
  }

  @UseGuards(JwtAuthGuard)
  @Post('ajuste-precios')
  ajustePrecios(
    @Body() body: AjustePreciosDto,
    @Headers('x-motel-id') motelIdHeader?: string,
    @Query('motelId') motelIdQuery?: string,
  ) {
    const motelId = motelIdQuery || motelIdHeader;
    return this.productosService.ajustePrecios({ ...body, motelId });
  }

  @UseGuards(JwtAuthGuard)
  @Get('con-stock-secundario')
  conStockSecundario(
    @Headers('x-motel-id') motelIdHeader?: string,
    @Query('motelId') motelIdQuery?: string,
    @Query('facturable') facturable?: string,
  ) {
    const motelId = motelIdQuery || motelIdHeader;
    const facturableFilter = facturable === 'true' ? true : facturable === 'false' ? false : undefined;
    return this.productosService.conStockSecundario(motelId, facturableFilter);
  }

  @UseGuards(JwtAuthGuard)
  @Get('con-stock-primario')
  conStockPrimario(
    @Headers('x-motel-id') motelIdHeader?: string,
    @Query('motelId') motelIdQuery?: string,
  ) {
    const motelId = motelIdQuery || motelIdHeader;
    return this.productosService.conStockPrimario(motelId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('auditoria-stock')
  auditoriaStock(
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Headers('x-motel-id') motelIdHeader?: string,
    @Query('motelId') motelIdQuery?: string,
  ) {
    const motelId = motelIdQuery || motelIdHeader;
    return this.productosService.auditoriaStock(desde, hasta, motelId);
  }
}

