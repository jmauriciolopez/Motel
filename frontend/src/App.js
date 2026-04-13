import './App.css';
import { Route } from "react-router-dom";
import { Admin, Resource, CustomRoutes } from 'react-admin';
import { nestDataProvider as dataProvider } from './shared/api/nestDataProvider';
import authProvider from './authProvider'
import moteles from './Operaciones/moteles';
import clientes from './Operaciones/clientes';
import turnos from './Operaciones/turnos';
import productos from './Operaciones/productos';
import gastos from './Operaciones/gastos';
import cajas from './Operaciones/cajas';
import rubros from './Operaciones/rubros';
import proveedores from './Operaciones/proveedores';
import habitaciones from './Operaciones/habitaciones';
import depositos from './Operaciones/depositos';
import tarifas from './Operaciones/tarifas';
import consumos from './Operaciones/consumos';
import limpiezas from './Operaciones/limpiezas';
import pagos from './Operaciones/pagos';
import mantenimientos from './Operaciones/mantenimientos';
import propietarios from './Operaciones/propietarios';
import compras from './Operaciones/compras';
import compradetalles from './Operaciones/compradetalles';
import formapagos from './Operaciones/formaspagos';

import { ModernLayout } from './layout/Layout';
import { customTheme } from './layout/theme';
import { i18nProvider } from './traductor';
import Dashboard from './dashboard/Dashboard';
import StockReporte from './Reportes/stocks'
import ReporteTurnosCompletados from './Reportes/reporteturnoscompletados';
import ReporteIngresos from './Reportes/reporteingresos';
import ReporteRendimiento from './Reportes/reporterendimiento';
import EstimacionCostos from './Reportes/EstimacionCostos';
import ListaCompras from './Reportes/ListaCompras';
import HistorialClientes from './Reportes/HistorialClientes';
import CuadroTarifario from './Reportes/CuadroTarifario';
import LoginPage from './layout/LoginPage';
import insumos from './Operaciones/insumos';
import insumodetalles from './Operaciones/insumodetalles';
import transferencias from './Operaciones/transferencias';
import transferenciadetalles from './Operaciones/transferenciadetalles';
import catalogoproductos from './Operaciones/catalogoproductos';
import ReporteDiscrepancias from './Reportes/ReporteDiscrepancias';
import ReporteAnalitico from './Reportes/ReporteAnalitico';
import AuditoriaStock from './Reportes/AuditoriaStock';
import GestorUsuarios from './Operaciones/usuarios';
import SignupPage from './layout/SignupPage';
import AjustePrecios from './Operaciones/AjustePrecios';

import { MotelProvider } from './context/MotelContext';

function App() {
  return (
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
          const role = typeof permissions === 'string' ? permissions : '';
          const isSuperAdmin = role === 'SuperAdmin';
          const isAdmin = isSuperAdmin || role === 'Administrador';
          const isSupervisor = isAdmin || role === 'Supervisor';
          const isRecepcionist = isSupervisor || role === 'Recepcionista';

          return (
            <>
              {/* Operaciones - Siempre visibles para Recepcionista en adelante */}
              <Resource name="turnos" {...turnos} />
              <Resource name="clientes" {...clientes} />
              <Resource 
                name="habitaciones" 
                list={isSupervisor ? habitaciones.list : null}
                edit={isAdmin ? habitaciones.edit : null}
                create={isAdmin ? habitaciones.create : null}
              />
              <Resource name="consumos" {...consumos} />
              <Resource name="pagos" {...pagos} />
              <Resource name="limpiezas" {...limpiezas} />
              <Resource name="mantenimientos" {...mantenimientos} />


              {isSuperAdmin && <Resource name="propietarios" {...propietarios} options={{ label: 'Propietarios' }} />}
              <Resource 
                name="tarifas" 
                list={tarifas.list}
                edit={isAdmin ? tarifas.edit : null}
                create={isAdmin ? tarifas.create : null}
              />
              <Resource name="insumos" {...insumos} options={{ label: 'Insumos' }} />
              <Resource name="insumodetalles" {...insumodetalles} options={{ label: 'Detalle Insumos' }} />
              <Resource name="productos" {...productos} />
              <Resource name="depositos" {...depositos} />

              {/* Gestión - Solo Supervisor y Admin */}
              {isSupervisor && (
                <>
                  <Resource name="cajas" {...cajas} />
                  <Resource name="gastos" {...gastos} />
                  <Resource name="compras" {...compras} />
                  <Resource name="compradetalles" {...compradetalles} />
                   <Resource name="transferencias" {...transferencias} options={{ label: 'Mov. Stock' }} />
                   <Resource name="transferenciadetalles" {...transferenciadetalles} options={{ label: 'Detalle Mov.' }} />
                   <Resource name="rubros" {...rubros} />
                   <Resource name="proveedores" {...proveedores} />
                 </>
               )}

              {/* Configuración - Solo Admin */}
              {isAdmin && (
                <>
                  <Resource name="moteles" {...moteles} />
                  <Resource name="formapagos" options={{ label: 'Formas de Pago' }} {...formapagos} />
                </>
              )}

              {/* Catálogo global — lectura para Supervisor+, CRUD solo SuperAdmin */}
              {isSupervisor && (
                <Resource name="catalogo-productos" {...catalogoproductos} options={{ label: 'Catálogo' }} />
              )}

              {/* Reportes - Visibles para Supervisor y Admin */}
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
  );
}

export default App;
