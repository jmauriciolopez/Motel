import React, { lazy } from 'react';
import { Route } from "react-router-dom";
import { Admin, Resource, CustomRoutes } from 'react-admin';
import { nestDataProvider as dataProvider } from './shared/api/nestDataProvider';
import authProvider from './authProvider';
import { ModernLayout } from './layout/Layout';
import { customTheme } from './layout/theme';
import { i18nProvider } from './traductor';
import Dashboard from './dashboard/Dashboard';
import LoginPage from './layout/LoginPage';
import SignupPage from './layout/SignupPage';
import { MotelProvider } from './context/MotelContext';
import ErrorBoundary from './layout/ErrorBoundary';

// Helper for lazy loading resource components
const lazyResource = (path) => ({
    list: lazy(() => import(`./Operaciones/${path}.js`).then(m => ({ default: m.default.list }))),
    edit: lazy(() => import(`./Operaciones/${path}.js`).then(m => ({ default: m.default.edit || (() => null) }))),
    create: lazy(() => import(`./Operaciones/${path}.js`).then(m => ({ default: m.default.create || (() => null) }))),
});

// Lazy Resources
const turnos = lazyResource('turnos');
const clientes = lazyResource('clientes');
const productos = lazyResource('productos');
const gastos = lazyResource('gastos');
const cajas = lazyResource('cajas');
const rubros = lazyResource('rubros');
const proveedores = lazyResource('proveedores');
const habitaciones = lazyResource('habitaciones');
const depositos = lazyResource('depositos');
const tarifas = lazyResource('tarifas');
const consumos = lazyResource('consumos');
const limpiezas = lazyResource('limpiezas');
const pagos = lazyResource('pagos');
const mantenimientos = lazyResource('mantenimientos');
const propietarios = lazyResource('propietarios');
const compras = lazyResource('compras');
const compradetalles = lazyResource('compradetalles');
const formapagos = lazyResource('formaspagos');
const insumos = lazyResource('insumos');
const insumodetalles = lazyResource('insumodetalles');
const transferencias = lazyResource('transferencias');
const transferenciadetalles = lazyResource('transferenciadetalles');
const catalogoproductos = lazyResource('catalogoproductos');
const GestorUsuarios = lazy(() => import('./Operaciones/usuarios.js'));
const AjustePrecios = lazy(() => import('./Operaciones/AjustePrecios.js'));

// Lazy Reports
const StockReporte = lazy(() => import('./Reportes/stocks.js'));
const ReporteTurnosCompletados = lazy(() => import('./Reportes/reporteturnoscompletados.js'));
const ReporteIngresos = lazy(() => import('./Reportes/reporteingresos.js'));
const ReporteRendimiento = lazy(() => import('./Reportes/reporterendimiento.js'));
const EstimacionCostos = lazy(() => import('./Reportes/EstimacionCostos.js'));
const ListaCompras = lazy(() => import('./Reportes/ListaCompras.js'));
const HistorialClientes = lazy(() => import('./Reportes/HistorialClientes.js'));
const CuadroTarifario = lazy(() => import('./Reportes/CuadroTarifario.js'));
const ReporteDiscrepancias = lazy(() => import('./Reportes/ReporteDiscrepancias.js'));
const ReporteAnalitico = lazy(() => import('./Reportes/ReporteAnalitico.js'));
const AuditoriaStock = lazy(() => import('./Reportes/AuditoriaStock.js'));

function App() {
    return (
        <ErrorBoundary>
            <MotelProvider>
                <Admin
                    theme={customTheme}
                    dashboard={Dashboard}
                    authProvider={authProvider}
                    dataProvider={dataProvider}
                    layout={ModernLayout}
                    loginPage={LoginPage}
                    i18nProvider={i18nProvider}
                >
                    {permissions => {
                      //  console.log('[DEBUG App.jsx] permissions received from React-Admin:', permissions);
                        const rawRole = typeof permissions === 'string' ? permissions : (permissions?.role || sessionStorage.getItem('role') || '');
                        const role = String(rawRole).toUpperCase();
                        const isSuperAdmin = role === 'SUPERADMIN';
                        const isAdmin = isSuperAdmin || role === 'ADMINISTRADOR';
                        const isSupervisor = isAdmin || role === 'SUPERVISOR';
                     //   console.log('[DEBUG App.jsx] Computed roles -> rawRole:', rawRole, 'role:', role, 'isAdmin:', isAdmin, 'isSupervisor:', isSupervisor);

                        return (
                            <>
                                {/* Operaciones */}
                                <Resource name="turnos" list={turnos.list} edit={turnos.edit} create={turnos.create} />
                                <Resource name="clientes" list={clientes.list} edit={clientes.edit} create={clientes.create} />
                                <Resource
                                    name="habitaciones"
                                    list={habitaciones.list}
                                    edit={isAdmin ? habitaciones.edit : null}
                                    create={isAdmin ? habitaciones.create : null}
                                />
                                <Resource name="consumos" list={consumos.list} edit={consumos.edit} create={consumos.create} />
                                <Resource name="pagos" list={pagos.list} edit={pagos.edit} create={pagos.create} />
                                <Resource name="limpiezas" list={limpiezas.list} edit={limpiezas.edit} create={limpiezas.create} />
                                <Resource name="mantenimientos" list={mantenimientos.list} edit={mantenimientos.edit} create={mantenimientos.create} />

                                {isSuperAdmin && <Resource name="propietarios" list={propietarios.list} edit={propietarios.edit} create={propietarios.create} />}
                                <Resource
                                    name="tarifas"
                                    list={tarifas.list}
                                    edit={isAdmin ? tarifas.edit : null}
                                    create={isAdmin ? tarifas.create : null}
                                />
                                <Resource name="insumos" list={insumos.list} edit={insumos.edit} create={insumos.create} />
                                <Resource name="insumodetalles" list={insumodetalles.list} edit={insumodetalles.edit} create={insumodetalles.create} />
                                <Resource name="productos" list={productos.list} edit={productos.list} create={productos.create} />
                                <Resource name="depositos" list={depositos.list} edit={depositos.edit} create={depositos.create} />

                                {/* Gestion */}
                                {isSupervisor && (
                                    <>
                                        <Resource name="cajas" list={cajas.list} edit={cajas.edit} create={cajas.create} />
                                        <Resource name="gastos" list={gastos.list} edit={gastos.edit} create={gastos.create} />
                                        <Resource name="compras" list={compras.list} edit={compras.edit} create={compras.create} />
                                        <Resource name="compradetalles" list={compradetalles.list} edit={compradetalles.edit} create={compradetalles.create} />
                                        <Resource name="transferencias" list={transferencias.list} edit={transferencias.edit} create={transferencias.create} />
                                        <Resource name="transferenciadetalles" list={transferenciadetalles.list} edit={transferenciadetalles.edit} create={transferenciadetalles.create} />
                                        <Resource name="rubros" list={rubros.list} edit={rubros.edit} create={rubros.create} />
                                        <Resource name="proveedores" list={proveedores.list} edit={proveedores.edit} create={proveedores.create} />
                                    </>
                                )}

                                {/* Configuracion */}
                                {isAdmin && (
                                    <>
                                        <Resource name="moteles" list={lazy(() => import('./Operaciones/moteles.js').then(m => ({ default: m.default.list })))} edit={lazy(() => import('./Operaciones/moteles.js').then(m => ({ default: m.default.edit })))} create={lazy(() => import('./Operaciones/moteles.js').then(m => ({ default: m.default.create })))} />
                                        <Resource name="formapagos" list={formapagos.list} edit={formapagos.edit} create={formapagos.create} />
                                    </>
                                )}

                                {isSupervisor && (
                                    <Resource name="catalogo-productos" list={catalogoproductos.list} edit={catalogoproductos.list} create={catalogoproductos.create} />
                                )}

                                {isSupervisor && (
                                    <Resource name="stocks" list={StockReporte} />
                                )}

                                <CustomRoutes>
                                    {isSupervisor && <Route path="/ReporteTurnosCompletados" element={<ReporteTurnosCompletados />} />}
                                    {isAdmin && <Route path="/GestorUsuarios" element={<GestorUsuarios />} />}
                                    {isSupervisor && <Route path="/ReporteIngresos" element={<ReporteIngresos />} />}
                                    {isSupervisor && <Route path="/ReporteRendimiento" element={<ReporteRendimiento />} />}
                                    {isSupervisor && <Route path="/ReporteEstimacion" element={<EstimacionCostos />} />}
                                    {isSupervisor && <Route path="/ListaCompras" element={<ListaCompras />} />}
                                    {isSupervisor && <Route path="/ReporteClientes" element={<HistorialClientes />} />}
                                    {isSupervisor && <Route path="/ReporteDiscrepancias" element={<ReporteDiscrepancias />} />}
                                    {isSupervisor && <Route path="/CuadroTarifario" element={<CuadroTarifario />} />}
                                    {isSupervisor && <Route path="/ReporteAnalitico" element={<ReporteAnalitico />} />}
                                    {isSupervisor && <Route path="/AuditoriaStock" element={<AuditoriaStock />} />}
                                    {isAdmin && <Route path="/AjustePrecios" element={<AjustePrecios />} />}
                                    <Route path="/signup" element={<SignupPage />} noLayout />
                                </CustomRoutes>
                            </>
                        );
                    }}
                </Admin>
            </MotelProvider>
        </ErrorBoundary>
    );
}

export default App;
