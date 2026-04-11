import React from 'react';
import { Card, CardContent, Typography, Grid, Box, CircularProgress, Stack } from '@mui/material';
import {
    Users,
    Calendar,
    CreditCard,
    TrendingUp,
    Activity,
    CheckCircle2,
    Clock,
    BedDouble,
    AlertTriangle,
    Package,
    Wrench,
    Coffee,
    Wallet,
    Utensils
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useGetList, useTranslate } from 'react-admin';
import { useMotel } from '../context/MotelContext';

const StatCard = ({ title, value, icon: Icon, color, trend, loading }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
    >
        <Card sx={{
            height: '100%',
            borderRadius: '24px',
            boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)',
            background: 'white',
            border: '1px solid rgba(0,0,0,0.03)',
        }}>
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box sx={{
                        p: 1.5,
                        borderRadius: '16px',
                        backgroundColor: `${color}15`,
                        color: color
                    }}>
                        <Icon size={24} />
                    </Box>
                    {trend && !loading && (
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            color: '#10b981',
                            backgroundColor: '#10b98115',
                            px: 1,
                            py: 0.5,
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: 700
                        }}>
                            <TrendingUp size={14} style={{ marginRight: 4 }} />
                            {trend}
                        </Box>
                    )}
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 800, mt: 3, mb: 1, color: '#1e293b' }}>
                    {loading ? <CircularProgress size={24} color="inherit" /> : value}
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {title}
                </Typography>
            </CardContent>
        </Card>
    </motion.div>
);

const AdminDashboard = () => {
    const { currentMotelId: motelId } = useMotel();
    const refetchInterval = Number(import.meta.env.VITE_DASHBOARD_REFRESH_MS) || 120000;

    // Fetch Active Shifts (Ocupación)
    const { data: activeShifts, isLoading: loadingShifts } = useGetList('turnos', {
        filter: { Salida: null, 'habitacion.motelId': motelId },
        pagination: { page: 1, perPage: 100 }
    }, { refetchInterval });

    // Fetch Dirty Rooms
    const { data: dirtyRooms, isLoading: loadingHabitaciones } = useGetList('habitaciones', {
        filter: { Estado: 'LIMPIEZA', motelId },
        pagination: { page: 1, perPage: 100 }
    }, { refetchInterval });

    // Fetch Low Stock
    const { data: lowStock, isLoading: loadingStock } = useGetList('stocks', {
        filter: { motelId, 'Cantidad': { $lt: 5 } },
        pagination: { page: 1, perPage: 100 }
    }, { refetchInterval });

    // Fetch Total Rooms for Ratio
    const { total: totalRooms } = useGetList('habitaciones', {
        filter: { motelId, Activa: true },
        pagination: { page: 1, perPage: 1 }
    }, { refetchInterval });

    const activeCount = activeShifts?.length || 0;
    const dirtyCount = dirtyRooms?.length || 0;
    const lowStockCount = lowStock?.length || 0;
    const ocupacionPct = totalRooms ? Math.round((activeCount / totalRooms) * 100) : 0;

    // Financial Data
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const { data: allTodayPayments, isLoading: loadingTotal } = useGetList('pagos', {
        filter: {
            motelId,
            createdAt: { $gte: todayISO }
        },
        pagination: { page: 1, perPage: 1000 }
    });

    const totalRevenue = allTodayPayments?.reduce((sum, p) => sum + (p.Importe || 0), 0) || 0;
    
    // Fetch Active Maintenances
    const { data: activeMantenimientos, isLoading: loadingMaint } = useGetList('mantenimientos', {
        filter: { Finalizado: false, motelId },
        pagination: { page: 1, perPage: 100 }
    });

    // Fetch Today's Cleanings
    const { data: todayLimpiezas, isLoading: loadingLimpiezas } = useGetList('limpiezas', {
        filter: { 
            motelId,
            createdAt: { $gte: todayISO }
        },
        pagination: { page: 1, perPage: 100 }
    });

    // Fetch Today's Consumos
    const { data: todayConsumos, isLoading: loadingConsumosTotal } = useGetList('consumos', {
        filter: { 
            motelId,
            createdAt: { $gte: todayISO }
        },
        pagination: { page: 1, perPage: 1000 }
    });

    const totalConsumos = todayConsumos?.reduce((sum, c) => sum + (c.Importe || 0), 0) || 0;

    // Fetch Historical Turns for Efficiency
    const { data: historicalTurns } = useGetList('turnos', {
        filter: { 
            'habitacion.motelId': motelId,
            Salida: { $null: false }
        },
        sort: { field: 'Salida', order: 'DESC' },
        pagination: { page: 1, perPage: 50 }
    });

    // Recent Payments List
    const { data: recentPayments, isLoading: loadingPayments } = useGetList('pagos', {
        filter: { motelId },
        sort: { field: 'id', order: 'DESC' },
        pagination: { page: 1, perPage: 5 }
    });

    // Average Time Stay
    const calculateAvgTime = () => {
        if (!historicalTurns || historicalTurns.length === 0) return '--';
        const totalMinutes = historicalTurns.reduce((acc, t) => {
            const duration = (new Date(t.Salida) - new Date(t.Ingreso)) / (1000 * 60);
            return acc + duration;
        }, 0);
        const avg = totalMinutes / historicalTurns.length;
        const hours = Math.floor(avg / 60);
        const minutes = Math.round(avg % 60);
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    };

    // Payment Distribution Logic
    const paymentDistribution = allTodayPayments?.reduce((acc, p) => {
        const type = p.formaPago?.Tipo || 'Efectivo';
        acc[type] = (acc[type] || 0) + (Number(p.Importe) || 0);
        return acc;
    }, {}) || {};

    const PaymentDistributionCard = ({ distribution, total }) => (
        <Card sx={{ borderRadius: '24px', height: '240px', p: 3, boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Distribución de Pagos</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1, justifyContent: 'center' }}>
                {Object.entries(distribution).map(([type, amount]) => {
                    const pct = total > 0 ? (amount / total) * 100 : 0;
                    return (
                        <Box key={type}>
                            <Box display="flex" justifyContent="space-between" mb={0.5}>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>{type}</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 800 }}>$ {amount.toLocaleString()}</Typography>
                            </Box>
                            <Box sx={{ width: '100%', height: '6px', bgcolor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ duration: 1 }}
                                    style={{ 
                                        height: '100%', 
                                        background: type.toLowerCase().includes('efectivo') ? '#10b981' : '#6366f1',
                                        borderRadius: '3px' 
                                    }}
                                />
                            </Box>
                        </Box>
                    );
                })}
            </Box>
        </Card>
    );

    return (
        <Box sx={{ p: 4 }}>
            <Box mb={6} display="flex" justifyContent="space-between" alignItems="flex-end">
                <Box>
                    <Typography variant="h3" sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, color: '#0f172a', mb: 1 }}>Panel Estratégico</Typography>
                    <Typography variant="h6" sx={{ color: '#64748b', fontWeight: 400 }}>Resumen detallado de ingresos y rendimiento.</Typography>
                </Box>
                <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Activity size={20} />
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Filtro: Hoy</Typography>
                </Box>
            </Box>

            <Grid container spacing={4}>
                {/* Row 1: Key Metrics */}
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Turnos Activos" value={activeCount} icon={Calendar} color="#6366f1" trend={`${ocupacionPct}% ocup.`} loading={loadingShifts} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Por Limpiar" value={dirtyCount} icon={AlertTriangle} color="#f59e0b" loading={loadingHabitaciones} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Recaudación" value={`$ ${totalRevenue.toLocaleString()}`} icon={CreditCard} color="#10b981" loading={loadingTotal} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Consumos" value={`$ ${totalConsumos.toLocaleString()}`} icon={Utensils} color="#f59e0b" loading={loadingConsumosTotal} />
                </Grid>

                {/* Row 2: Secondary Metrics */}
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Limpiezas Hoy" value={todayLimpiezas?.length || 0} icon={Coffee} color="#ec4899" loading={loadingLimpiezas} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Mantenimiento" value={activeMantenimientos?.length || 0} icon={Wrench} color="#64748b" loading={loadingMaint} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Stock Bajo" value={lowStockCount} icon={Package} color="#ef4444" loading={loadingStock} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Eficiencia" value={calculateAvgTime()} icon={Clock} color="#8b5cf6" trend="Promedio" />
                </Grid>

                {/* Charts & Visual Summary */}
                <Grid item xs={12} md={4}>
                    <StatCard title="Capacidad" value={`${activeCount}/${totalRooms || '--'}`} icon={BedDouble} color="#3b82f6" />
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{
                        borderRadius: '24px', height: '240px', display: 'flex', flexDirection: 'column',
                        justifyContent: 'center', alignItems: 'center',
                        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', color: 'white', p: 3
                    }}>
                        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>{ocupacionPct}% Ocupación</Typography>
                        <Box sx={{ width: '100%', height: '8px', bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                            <motion.div initial={{ width: 0 }} animate={{ width: `${ocupacionPct}%` }} transition={{ duration: 1 }} style={{ height: '100%', background: '#6366f1' }} />
                        </Box>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <PaymentDistributionCard distribution={paymentDistribution} total={totalRevenue} />
                </Grid>

                {/* Lists */}
                <Grid item xs={12} md={8}>
                     <Card sx={{ borderRadius: '24px', height: '300px', p: 3, boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Últimos Cobros</Typography>
                        <Stack spacing={2} sx={{ overflowY: 'auto', pr: 1 }}>
                            {recentPayments?.map((pago) => (
                                <Box key={pago.id} display="flex" alignItems="center" gap={2} sx={{ p: 2, borderRadius: '16px', bgcolor: '#f8fafc' }}>
                                    <Box sx={{ p: 1, borderRadius: '12px', bgcolor: '#10b98115', color: '#10b981' }}>
                                        <CheckCircle2 size={18} />
                                    </Box>
                                    <Box flexGrow={1}>
                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>Hab. {pago.turno?.habitacion?.Identificador || '---'}</Typography>
                                        <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                                            {pago.turno?.cliente ? `${pago.turno.cliente.Marca || 'S/Marca'} ${pago.turno.cliente.Color || ''}` : 'Cliente S/N'}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>{pago.formaPago?.Tipo || 'Pago'}</Typography>
                                    </Box>
                                    <Typography variant="body2" sx={{ fontWeight: 800 }}>$ {Number(pago.Importe || 0).toLocaleString()}</Typography>
                                </Box>
                            ))}
                        </Stack>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ borderRadius: '24px', height: '300px', p: 3, boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', bgcolor: lowStockCount > 0 ? '#fffafb' : '#f8fafc', border: lowStockCount > 0 ? '1px solid #fee2e2' : 'none' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: lowStockCount > 0 ? '#ef4444' : '#64748b' }}>
                            <Package size={20} /> Falta Reponer
                        </Typography>
                        <Stack spacing={1.5} sx={{ overflowY: 'auto' }}>
                            {lowStock?.map(item => (
                                <Box key={item.id} sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'white', border: '1px solid #fee2e2' }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>{item.producto?.Nombre}</Typography>
                                    <Typography variant="caption" color="error" sx={{ fontWeight: 600 }}>Solo {item.Cantidad} unidades</Typography>
                                </Box>
                            ))}
                            {lowStockCount === 0 && <Typography variant="body2" sx={{ color: '#94a3b8', textAlign: 'center', mt: 4 }}>Sin alertas de stock.</Typography>}
                        </Stack>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default AdminDashboard;
