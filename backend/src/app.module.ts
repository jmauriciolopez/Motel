import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './modulos/autenticacion/guards/jwt-auth.guard';
import { TenantGuard } from './compartido/guards/tenant.guard';
import { RolesGuard } from './compartido/guards/roles.guard';
import { PrismaModule } from './prisma/prisma.module';
import { PropietariosModule } from './modulos/propietarios/propietarios.module';
import { UsuariosModule } from './modulos/usuarios/usuarios.module';
import { MotelesModule } from './modulos/moteles/moteles.module';
import { HabitacionesModule } from './modulos/habitaciones/habitaciones.module';
import { TarifasModule } from './modulos/tarifas/tarifas.module';
import { TurnosModule } from './modulos/turnos/turnos.module';
import { ClientesModule } from './modulos/clientes/clientes.module';
import { MovilidadesModule } from './modulos/movilidades/movilidades.module';
import { RubrosModule } from './modulos/rubros/rubros.module';
import { CatalogoProductosModule } from './modulos/catalogo-productos/catalogo-productos.module';
import { ProductosModule } from './modulos/productos/productos.module';
import { DepositosModule } from './modulos/depositos/depositos.module';
import { StockModule } from './modulos/stock/stock.module';
import { ComprasModule } from './modulos/compras/compras.module';
import { InsumosModule } from './modulos/insumos/insumos.module';
import { TransferenciasModule } from './modulos/transferencias/transferencias.module';
import { AutenticacionModule } from './modulos/autenticacion/autenticacion.module';
import { ConsumosModule } from './modulos/consumos/consumos.module';
import { FormasPagoModule } from './modulos/formas-pago/formas-pago.module';
import { PagosModule } from './modulos/pagos/pagos.module';
import { GastosModule } from './modulos/gastos/gastos.module';
import { LimpiezasModule } from './modulos/limpiezas/limpiezas.module';
import { MantenimientosModule } from './modulos/mantenimientos/mantenimientos.module';
import { CajasModule } from './modulos/cajas/cajas.module';
import { ProveedoresModule } from './modulos/proveedores/proveedores.module';
import { ReservasModule } from './modulos/reservas/reservas.module';

@Module({
  imports: [
    PrismaModule,
    PropietariosModule,
    UsuariosModule,
    MotelesModule,
    HabitacionesModule,
    TarifasModule,
    TurnosModule,
    ClientesModule,
    MovilidadesModule,
    RubrosModule,
    CatalogoProductosModule,
    ProductosModule,
    DepositosModule,
    StockModule,
    ComprasModule,
    InsumosModule,
    TransferenciasModule,
    AutenticacionModule,
    ConsumosModule,
    FormasPagoModule,
    PagosModule,
    GastosModule,
    LimpiezasModule,
    MantenimientosModule,
    CajasModule,
    ProveedoresModule,
    ReservasModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
