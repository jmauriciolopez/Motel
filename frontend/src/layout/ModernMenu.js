import React, { useState } from 'react';
import { Menu, MenuItemLink, useSidebarState, usePermissions } from 'react-admin';
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
                primaryText="Dashboard"
                leftIcon={<LayoutDashboard size={20} />}
                className="group"
            />

            {/* SECCIÓN OPERACIONES */}
            {effectiveRecepcionist && (
                <SubMenu
                    handleToggle={() => handleToggle('operaciones')}
                    isOpen={activeMenu === 'operaciones'}
                    name="Operaciones"
                    icon={<Briefcase size={20} />}
                >
                    <MenuItemLink to="/turnos" primaryText="Turnos" leftIcon={<Calendar size={20} />} />
                    <MenuItemLink to="/clientes" primaryText="Clientes" leftIcon={<Users size={20} />} />
                    <MenuItemLink to="/limpiezas" primaryText="Limpieza" leftIcon={<Trash2 size={20} />} />
                    <MenuItemLink to="/mantenimientos" primaryText="Mantenimiento" leftIcon={<Wrench size={20} />} />
                    <MenuItemLink to="/insumos" primaryText="Insumos" leftIcon={<Sparkles size={20} />} />
                </SubMenu>
            )}

            {/* SECCIÓN FINANZAS */}
            {effectiveSupervisor && (
                <SubMenu
                    handleToggle={() => handleToggle('finanzas')}
                    isOpen={activeMenu === 'finanzas'}
                    name="Finanzas"
                    icon={<Wallet size={20} />}
                >
                    <MenuItemLink to="/cajas" primaryText="Cajas" leftIcon={<Wallet size={20} />} />
                    <MenuItemLink to="/gastos" primaryText="Gastos" leftIcon={<CreditCard size={20} />} />

                </SubMenu>
            )}

            {/* SECCIÓN INVENTARIO */}
            {effectiveSupervisor && (
                <SubMenu
                    handleToggle={() => handleToggle('inventario')}
                    isOpen={activeMenu === 'inventario'}
                    name="Inventario"
                    icon={<Warehouse size={20} />}
                >
                    <MenuItemLink to="/productos" primaryText="Productos" leftIcon={<Package size={20} />} />
                    <MenuItemLink to="/rubros" primaryText="Rubros" leftIcon={<Activity size={20} />} />
                    <MenuItemLink to="/proveedores" primaryText="Proveedores" leftIcon={<Users size={20} />} />
                    <MenuItemLink to="/depositos" primaryText="Depósitos" leftIcon={<Warehouse size={20} />} />
                    <MenuItemLink to="/catalogo-productos" primaryText="Catálogo" leftIcon={<BookOpen size={20} />} />
                    <MenuItemLink to="/compras" primaryText="Compras" leftIcon={<ShoppingCart size={20} />} />
                    <MenuItemLink to="/transferencias" primaryText="Mov. Stock" leftIcon={<ArrowLeftRight size={20} />} />
                    <MenuItemLink to="/stocks" primaryText="Reporte Stock" leftIcon={<FileText size={20} />} />
                </SubMenu>
            )}

            {/* SECCIÓN REPORTES */}
            {effectiveSupervisor && (
                <SubMenu
                    handleToggle={() => handleToggle('reportes')}
                    isOpen={activeMenu === 'reportes'}
                    name="Reportes"
                    icon={<BarChart2 size={20} />}
                >

                    <MenuItemLink to="/ReporteTurnos" primaryText="Reporte Turnos" leftIcon={<Activity size={20} />} />
                    <MenuItemLink to="/ReporteIngresos" primaryText="Reporte Ingresos" leftIcon={<Activity size={20} />} />
                    <MenuItemLink to="/ReporteRendimiento" primaryText="Rendimiento" leftIcon={<TrendingUp size={20} />} />
                    <MenuItemLink to="/ReporteEstimacion" primaryText="Est. de Costos" leftIcon={<Calculator size={20} />} />
                    <MenuItemLink to="/ListaCompras" primaryText="Lista de Compras" leftIcon={<ShoppingCart size={20} />} />
                    <MenuItemLink to="/ReporteClientes" primaryText="Historial Clientes" leftIcon={<Users size={20} />} />
                    <MenuItemLink to="/ReporteDiscrepancias" primaryText="Discrepancias" leftIcon={<AlertTriangle size={20} />} />
                    <MenuItemLink to="/ReporteAnalitico" primaryText="Analítico" leftIcon={<BarChart2 size={20} />} />
                    <MenuItemLink to="/AuditoriaStock" primaryText="Auditoría Stock" leftIcon={<Warehouse size={20} />} />
                </SubMenu>
            )}

            {/* SECCIÓN CONFIGURACIÓN */}
            {effectiveRecepcionist && (
                <SubMenu
                    handleToggle={() => handleToggle('configuracion')}
                    isOpen={activeMenu === 'configuracion'}
                    name="Configuración"
                    icon={<Settings size={20} />}
                >
                    {effectiveAdmin && <MenuItemLink to="/formapagos" primaryText="Formas de Pago" leftIcon={<CreditCard size={20} />} />}
                    {effectiveAdmin && <MenuItemLink to="/moteles" primaryText="Moteles" leftIcon={<Settings size={20} />} />}
                    <MenuItemLink to="/tarifas" primaryText="Tarifas" leftIcon={<Wallet size={20} />} />
                    {effectiveSupervisor && <MenuItemLink to="/habitaciones" primaryText="Habitaciones" leftIcon={<ClipboardList size={20} />} />}
                    {effectiveAdmin && <MenuItemLink to="/AjustePrecios" primaryText="Ajuste de Precios" leftIcon={<TrendingUp size={20} />} />}
                    {effectiveAdmin && <MenuItemLink to="/GestorUsuarios" primaryText="Usuarios" leftIcon={<Users size={20} />} />}
                    {isSuperAdmin && <MenuItemLink to="/propietarios" primaryText="Propietarios" leftIcon={<Users size={20} />} />}
                </SubMenu>
            )}
        </Menu>
    );
};

export default ModernMenu;
