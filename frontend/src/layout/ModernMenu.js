import React, { useState } from 'react';
import { Menu, MenuItemLink, useSidebarState, usePermissions, useTranslate } from 'react-admin';
import {
    LayoutDashboard,
    Users,
    Calendar,
    Package,
    Settings,
    FileText,
    Activity,
    ClipboardList,
    Sparkles,
    Wrench,
    Wallet,
    ShoppingCart,
    CreditCard,
    Warehouse,
    ArrowLeftRight,
    Trash2,
    TrendingUp,
    BarChart2,
    Briefcase,
    Calculator,
    BookOpen,
    AlertTriangle,
} from 'lucide-react';
import SubMenu from './SubMenu';

const ModernMenu = (props) => {
    const [open] = useSidebarState();
    const { permissions, isPending } = usePermissions();
    const [activeMenu, setActiveMenu] = useState('');
    const translate = useTranslate();

    const role = permissions || '';
    const isSuperAdmin = role === 'SuperAdmin';
    const isAdmin = isSuperAdmin || role === 'Administrador';
    const isSupervisor = isAdmin || role === 'Supervisor';
    const isRecepcionist = isSupervisor || role === 'Recepcionista';

    const effectiveAdmin = isAdmin;
    const effectiveSupervisor = isSupervisor;
    const effectiveRecepcionist = isRecepcionist;

    const handleToggle = (menu) => {
        setActiveMenu(activeMenu === menu ? '' : menu);
    };

    // No renderizar el menú hasta tener permisos resueltos
    if (isPending) return null;

    return (
        <Menu
            {...props}
            className={`mt-4 px-2 transition-all duration-300 ${open ? 'w-64' : 'w-20'}`}
            sx={{
                background: 'transparent',
                '& .RaMenuItemLink-root': {
                    borderRadius: '12px',
                    mb: 0.5,
                    py: 1.2,
                    transition: 'all 0.2s',
                    color: '#334155',
                    fontFamily: "'Outfit', sans-serif",
                    '&:hover': {
                        backgroundColor: '#f1f5f9',
                        color: '#0f172a',
                        transform: 'translateX(4px)',
                    },
                    '&.RaMenuItemLink-active': {
                        backgroundColor: '#eef2ff',
                        color: '#4338ca',
                        fontWeight: 700,
                        '& .MuiListItemIcon-root': {
                            color: '#4338ca',
                        }
                    }
                },
                '& .MuiCollapse-root .RaMenuItemLink-root': {
                    pl: open ? 4 : 2,
                    fontSize: '0.9rem',
                },
                // Estilos específicos para el encabezado del SubMenu
                '& .MuiMenuItem-root': {
                    borderRadius: '12px',
                    mb: 0.5,
                    py: 1.2,
                    color: '#334155',
                    '&:hover': {
                        backgroundColor: '#f1f5f9',
                    }
                }
            }}
        >
            <MenuItemLink
                to="/"
                primaryText={translate('ra.page.dashboard')}
                leftIcon={<LayoutDashboard size={20} />}
                className="group"
            />

            {/* SECCIÓN OPERACIONES */}
            {effectiveRecepcionist && (
                <SubMenu
                    handleToggle={() => handleToggle('operaciones')}
                    isOpen={activeMenu === 'operaciones'}
                    name={translate('resources.operaciones.name', { defaultValue: 'Operaciones' })}
                    icon={<Briefcase size={20} />}
                >
                    <MenuItemLink to="/turnos" primaryText={translate('resources.turnos.name')} leftIcon={<Calendar size={20} />} />
                    <MenuItemLink to="/clientes" primaryText={translate('resources.clientes.name')} leftIcon={<Users size={20} />} />
                    <MenuItemLink to="/limpiezas" primaryText={translate('resources.limpiezas.name')} leftIcon={<Trash2 size={20} />} />
                    <MenuItemLink to="/mantenimientos" primaryText={translate('resources.mantenimientos.name')} leftIcon={<Wrench size={20} />} />
                    <MenuItemLink to="/insumos" primaryText={translate('resources.insumos.name')} leftIcon={<Sparkles size={20} />} />
                </SubMenu>
            )}

            {/* SECCIÓN FINANZAS */}
            {effectiveSupervisor && (
                <SubMenu
                    handleToggle={() => handleToggle('finanzas')}
                    isOpen={activeMenu === 'finanzas'}
                    name={translate('resources.finanzas.name', { defaultValue: 'Finanzas' })}
                    icon={<Wallet size={20} />}
                >
                    <MenuItemLink to="/cajas" primaryText={translate('resources.cajas.name')} leftIcon={<Wallet size={20} />} />
                    <MenuItemLink to="/gastos" primaryText={translate('resources.gastos.name')} leftIcon={<CreditCard size={20} />} />
                </SubMenu>
            )}

            {/* SECCIÓN INVENTARIO */}
            {effectiveSupervisor && (
                <SubMenu
                    handleToggle={() => handleToggle('inventario')}
                    isOpen={activeMenu === 'inventario'}
                    name={translate('resources.inventario.name', { defaultValue: 'Inventario' })}
                    icon={<Warehouse size={20} />}
                >
                    <MenuItemLink to="/productos" primaryText={translate('resources.productos.name')} leftIcon={<Package size={20} />} />
                    <MenuItemLink to="/rubros" primaryText={translate('resources.rubros.name')} leftIcon={<Activity size={20} />} />
                    <MenuItemLink to="/proveedores" primaryText={translate('resources.proveedores.name')} leftIcon={<Users size={20} />} />
                    <MenuItemLink to="/depositos" primaryText={translate('resources.depositos.name')} leftIcon={<Warehouse size={20} />} />
                    <MenuItemLink to="/catalogo-productos" primaryText={translate('resources.catalogo-productos.name')} leftIcon={<BookOpen size={20} />} />
                    <MenuItemLink to="/compras" primaryText={translate('resources.compras.name')} leftIcon={<ShoppingCart size={20} />} />
                    <MenuItemLink to="/transferencias" primaryText={translate('resources.transferencias.name')} leftIcon={<ArrowLeftRight size={20} />} />
                    <MenuItemLink to="/stocks" primaryText={translate('resources.stocks.name')} leftIcon={<FileText size={20} />} />
                </SubMenu>
            )}

            {/* SECCIÓN REPORTES */}
            {effectiveSupervisor && (
                <SubMenu
                    handleToggle={() => handleToggle('reportes')}
                    isOpen={activeMenu === 'reportes'}
                    name={translate('resources.reportes.name', { defaultValue: 'Reportes' })}
                    icon={<BarChart2 size={20} />}
                >
                    <MenuItemLink to="/ReporteTurnosCompletados" primaryText={translate('resources.reporte-turnos.name', { defaultValue: 'Turnos Completados' })} leftIcon={<Activity size={20} />} />
                    <MenuItemLink to="/ReporteIngresos" primaryText={translate('resources.reporte-ingresos.name', { defaultValue: 'Reporte Ingresos' })} leftIcon={<Activity size={20} />} />
                    <MenuItemLink to="/ReporteRendimiento" primaryText={translate('resources.reporte-rendimiento.name', { defaultValue: 'Rendimiento' })} leftIcon={<TrendingUp size={20} />} />
                    <MenuItemLink to="/ReporteEstimacion" primaryText={translate('resources.reporte-costos.name', { defaultValue: 'Est. de Costos' })} leftIcon={<Calculator size={20} />} />
                    <MenuItemLink to="/ListaCompras" primaryText={translate('resources.lista-compras.name', { defaultValue: 'Lista de Compras' })} leftIcon={<ShoppingCart size={20} />} />
                    <MenuItemLink to="/ReporteClientes" primaryText={translate('resources.reporte-clientes.name', { defaultValue: 'Historial Clientes' })} leftIcon={<Users size={20} />} />
                    <MenuItemLink to="/ReporteDiscrepancias" primaryText={translate('resources.reporte-discrepancias.name', { defaultValue: 'Discrepancias' })} leftIcon={<AlertTriangle size={20} />} />
                    <MenuItemLink to="/ReporteAnalitico" primaryText={translate('resources.reporte-analitico.name', { defaultValue: 'Analítico' })} leftIcon={<BarChart2 size={20} />} />
                    <MenuItemLink to="/AuditoriaStock" primaryText={translate('resources.auditoria-stock.name', { defaultValue: 'Auditoría Stock' })} leftIcon={<Warehouse size={20} />} />
                </SubMenu>
            )}

            {/* SECCIÓN CONFIGURACIÓN */}
            {effectiveRecepcionist && (
                <SubMenu
                    handleToggle={() => handleToggle('configuracion')}
                    isOpen={activeMenu === 'configuracion'}
                    name={translate('resources.configuracion.name', { defaultValue: 'Configuración' })}
                    icon={<Settings size={20} />}
                >
                    {effectiveAdmin && <MenuItemLink to="/formapagos" primaryText={translate('resources.formapagos.name')} leftIcon={<CreditCard size={20} />} />}
                    {effectiveAdmin && <MenuItemLink to="/moteles" primaryText={translate('resources.moteles.name')} leftIcon={<Settings size={20} />} />}
                    <MenuItemLink to="/tarifas" primaryText={translate('resources.tarifas.name')} leftIcon={<Wallet size={20} />} />
                    {effectiveSupervisor && <MenuItemLink to="/habitaciones" primaryText={translate('resources.habitaciones.name')} leftIcon={<ClipboardList size={20} />} />}
                    {effectiveAdmin && <MenuItemLink to="/AjustePrecios" primaryText={translate('resources.ajuste-precios.name', { defaultValue: 'Ajuste de Precios' })} leftIcon={<TrendingUp size={20} />} />}
                    {effectiveAdmin && <MenuItemLink to="/GestorUsuarios" primaryText={translate('resources.usuarios.name')} leftIcon={<Users size={20} />} />}
                    {isSuperAdmin && <MenuItemLink to="/propietarios" primaryText={translate('resources.propietarios.name')} leftIcon={<Users size={20} />} />}
                </SubMenu>
            )}
        </Menu>
    );
};

export default ModernMenu;
