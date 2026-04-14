import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Grid, Box, CircularProgress, Stack, Chip, Divider, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import {
    Calendar,
    AlertTriangle,
    Wrench,
    Clock,
    BedDouble,
    CheckCircle2,
    Activity,
    Package,
    Sparkles,
    Coffee,
    ArrowRightCircle,
    ClipboardList,
    AlertCircle,
    Wallet,
    CreditCard,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useGetList, usePermissions, useTranslate } from 'react-admin';
import { useMotel } from '../context/MotelContext';
import { Cookies } from '../helpers/Utils';
const StatCard = ({ title, value, icon: Icon, color, loading, subtitle }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card sx={{ height: '100%', borderRadius: '24px', boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)', background: 'white', border: `1px solid ${color}20` }}>
            <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Box sx={{ p: 1.5, borderRadius: '16px', backgroundColor: `${color}15`, color: color }}><Icon size={24} /></Box>
                    <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</Typography>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 800, color: '#1e293b', mb: 0.5 }}>{loading ? <CircularProgress size={24} color="inherit" /> : value}</Typography>
                {subtitle && <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>{subtitle}</Typography>}
            </CardContent>
        </Card>
    </motion.div>
);

const SectionHeader = ({ title, icon: Icon, color }) => (
    <Box display="flex" alignItems="center" gap={1.5} mb={3} mt={2}>
        <Box sx={{ color: color }}><Icon size={20} /></Box>
        <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b', fontFamily: "'Outfit', sans-serif" }}>{title}</Typography>
        <Divider sx={{ flexGrow: 1, ml: 2, opacity: 0.5 }} />
    </Box>
);

const TimeStatus = ({ ingreso, minutos }) => {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 30000); // 30s update
        return () => clearInterval(interval);
    }, []);

    const startTime = new Date(ingreso).getTime();
    const endTime = startTime + (minutos || 0) * 60000;
    const diff = endTime - now.getTime();
    const isLate = diff < 0;

    const absDiff = Math.abs(diff);
    const hrs = Math.floor(absDiff / (1000 * 60 * 60));
    const mins = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));

    const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

    const translate = useTranslate();
    return (
        <Box sx={{
            px: 1.5,
            py: 0.5,
            borderRadius: '10px',
            bgcolor: isLate ? '#fee2e2' : '#e0f2fe',
            color: isLate ? '#ef4444' : '#0ea5e9',
            display: 'flex',
            alignItems: 'center',
            gap: 1
        }}>
            {isLate ? <AlertCircle size={16} /> : <Clock size={16} />}
            <Typography variant="caption" sx={{ fontWeight: 800 }}>
                {isLate ? `${translate('pos.dashboard.overdue')} +${timeStr}` : `${translate('pos.dashboard.remaining')} ${timeStr}`}
            </Typography>
        </Box>
    );
};

const OperatorDashboard = () => {
    const { currentMotelId: motelId } = useMotel();
    const { permissions } = usePermissions();
    const isRecepcionista = permissions === 'Recepcionista';
    const refetchInterval = Number(import.meta.env.VITE_DASHBOARD_REFRESH_MS) || 120000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // Obtener userId del usuario logueado
    let userId = null;
    try {
        const userStr = sessionStorage.getItem('user');
        const parsed = userStr ? JSON.parse(userStr) : null;
        userId = parsed?.id || null;
    } catch {
        userId = null;
    }

    const { data: activeShifts, isLoading: loadingShifts } = useGetList('turnos', { 
        filter: { Salida: { $null: true }, 'habitacion.motelId': motelId }, 
        pagination: { page: 1, perPage: 100 },
        sort: { field: 'Ingreso', order: 'ASC' }
    }, { refetchInterval });
    const { data: dirtyRooms, isLoading: loadingDirty } = useGetList('habitaciones', { filter: { Estado: { $in: ['LIMPIEZA'] }, motelId }, pagination: { page: 1, perPage: 100 } }, { refetchInterval });
    const { data: lowStock, isLoading: loadingStock } = useGetList('stocks', { filter: { motelId, 'Cantidad': { $lt: 5 } }, pagination: { page: 1, perPage: 100 } }, { refetchInterval });
    const { data: maintRooms, isLoading: loadingMaint } = useGetList('habitaciones', { filter: { Estado: 'MANTENIMIENTO', motelId }, pagination: { page: 1, perPage: 100 } }, { refetchInterval });
    const { data: todayLimpiezas, isLoading: loadingLimpiezas } = useGetList('limpiezas', { filter: { motelId, createdAt: { $gte: todayISO } }, pagination: { page: 1, perPage: 100 } }, { refetchInterval });
    const { total: totalRooms } = useGetList('habitaciones', { filter: { motelId, Activa: true }, pagination: { page: 1, perPage: 1 } }, { refetchInterval });

    // Último saldo de caja del motel
    const { data: cajas, isLoading: loadingCaja } = useGetList('cajas', {
        filter: { motelId },
        pagination: { page: 1, perPage: 1 },
        sort: { field: 'updatedAt', order: 'DESC' },
    }, { enabled: !!motelId, refetchInterval });
    const ultimaCaja = cajas?.[0];

    // Pagos del recepcionista logueado hoy
    const { data: misPagos, isLoading: loadingPagos } = useGetList('pagos', {
        filter: {
            motelId,
            createdAt: { $gte: todayISO },
        },
        pagination: { page: 1, perPage: 100 },
        sort: { field: 'id', order: 'DESC' },
    }, { enabled: !!motelId, refetchInterval });

    const totalMisPagos = misPagos?.reduce((s, p) => s + Number(p.Importe || 0), 0) || 0;
    const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);

    const activeCount = activeShifts?.length || 0;
    const dirtyCount = dirtyRooms?.length || 0;
    const maintCount = maintRooms?.length || 0;
    const lowStockCount = lowStock?.length || 0;
    const ocupacionPct = totalRooms ? Math.round((activeCount / totalRooms) * 100) : 0;
    const libresCount = (totalRooms || 0) - activeCount - dirtyCount - maintCount;

    const translate = useTranslate();

    return (
        <Box sx={{ p: 4 }}>
            <Box mb={6} display="flex" justifyContent="space-between" alignItems="flex-end">
                <Box>
                    <Typography variant="h3" sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, color: '#0f172a', mb: 1 }}>{translate('pos.dashboard.operational_panel')}</Typography>
                    <Typography variant="h6" sx={{ color: '#64748b', fontWeight: 400 }}>{translate('pos.dashboard.operational_subtitle')}</Typography>
                </Box>
                <Box sx={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Activity size={20} /><Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>{translate('pos.dashboard.active_shift')}</Typography>
                </Box>
            </Box>

            <Grid container spacing={4}>
                {/* Metrics Row */}
                <Grid item xs={12} sm={6} md={3}><StatCard title={translate('pos.dashboard.occupied')} value={activeCount} icon={Calendar} color="#6366f1" subtitle={translate('pos.dashboard.occupancy_trend', { pct: ocupacionPct })} loading={loadingShifts} /></Grid>
                <Grid item xs={12} sm={6} md={3}><StatCard title={translate('pos.dashboard.to_clean')} value={dirtyCount} icon={Sparkles} color="#f59e0b" subtitle={translate('pos.dashboard.operational_subtitle')} loading={loadingDirty} /></Grid>
                <Grid item xs={12} sm={6} md={3}><StatCard title={translate('pos.dashboard.free')} value={libresCount > 0 ? libresCount : 0} icon={BedDouble} color="#10b981" subtitle={translate('pos.dashboard.free_subtitle', { defaultValue: 'Listas para ingreso' })} /></Grid>
                <Grid item xs={12} sm={6} md={3}><StatCard title={translate('pos.dashboard.cleanings_today')} value={todayLimpiezas?.length || 0} icon={Coffee} color="#ec4899" loading={loadingLimpiezas} /></Grid>

                {/* Secondary Metrics Row */}
                <Grid item xs={12} sm={6} md={3}><StatCard title={translate('pos.dashboard.stock_low_alert')} value={lowStockCount} icon={Package} color="#ef4444" loading={loadingStock} /></Grid>
                <Grid item xs={12} sm={6} md={3}><StatCard title={translate('pos.dashboard.maintenance')} value={maintCount} icon={Wrench} color="#64748b" loading={loadingMaint} /></Grid>
                <Grid item xs={12} md={6}>
                    <Card sx={{
                        borderRadius: '24px', height: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', color: 'white', px: 3
                    }}>
                        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>{translate('pos.dashboard.occupancy_trend', { pct: ocupacionPct })}</Typography>
                        <Box sx={{ width: '100%', height: '8px', bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                            <motion.div initial={{ width: 0 }} animate={{ width: `${ocupacionPct}%` }} transition={{ duration: 1 }} style={{ height: '100%', background: '#6366f1' }} />
                        </Box>
                    </Card>
                </Grid>

                {/* Left Side: Active Turns */}
                <Grid item xs={12} md={8}>
                    <SectionHeader title={translate('pos.dashboard.actual_occupancy')} icon={Clock} color="#6366f1" />
                    <Stack spacing={2}>
                        {activeShifts?.map((turno) => {
                            const isExpired = (new Date(turno.Ingreso).getTime() + (turno.Minutos || 0) * 60000) < new Date().getTime();
                            return (
                                <Box key={turno.id} sx={{ 
                                    p: 2, 
                                    borderRadius: '20px', 
                                    bgcolor: 'white', 
                                    border: isExpired ? '2px solid #ef4444' : '1px solid #f1f5f9', 
                                    boxShadow: isExpired ? '0 0 15px rgba(239, 68, 68, 0.1)' : 'none',
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 3 
                                }}>
                                    <Box sx={{ 
                                        width: 50, 
                                        height: 50, 
                                        borderRadius: '15px', 
                                        bgcolor: isExpired ? '#ef444415' : '#6366f115', 
                                        color: isExpired ? '#ef4444' : '#6366f1', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        fontWeight: 800, 
                                        fontSize: '1.2rem' 
                                    }}>
                                        {turno.habitacion?.Identificador}
                                    </Box>
                                    <Box flexGrow={1}>
                                        <Typography variant="body1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                                            {turno.cliente ? `${turno.cliente.Marca || translate('pos.dashboard.no_brand')} ${turno.cliente.Color || ''}` : translate('pos.dashboard.no_client')}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>{turno.cliente?.Patente || translate('pos.dashboard.no_data')}</Typography>
                                            <Typography variant="caption" sx={{ color: '#cbd5e1' }}>•</Typography>
                                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>{translate('pos.dashboard.checkin')}: {new Date(turno.Ingreso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>
                                        </Box>
                                    </Box>
                                    <TimeStatus ingreso={turno.Ingreso} minutos={turno.Minutos} />
                                    <Chip 
                                        label={isExpired ? translate('pos.dashboard.exceeded') : translate('pos.dashboard.occupied_status')} 
                                        size="small" 
                                        sx={{ 
                                            bgcolor: isExpired ? '#ef4444' : '#eef2ff', 
                                            color: isExpired ? 'white' : '#6366f1', 
                                            fontWeight: 800 
                                        }} 
                                    />
                                </Box>
                            );
                        })}
                        {(!activeShifts || activeShifts.length === 0) && !loadingShifts && <Typography variant="body2" sx={{ textAlign: 'center', py: 4, color: '#94a3b8' }}>{translate('pos.dashboard.no_occupied_rooms')}</Typography>}
                    </Stack>
                </Grid>

                {/* Right Side: Tasks & Stock Alerts */}
                <Grid item xs={12} md={4}>
                    <SectionHeader title={translate('pos.dashboard.admin_panel')} icon={ClipboardList} color="#f59e0b" />
                    <Stack spacing={2}>
                         <Card sx={{ p: 2.5, borderRadius: '24px', border: dirtyCount > 0 ? '1px solid #fef3c7' : 'none', bgcolor: dirtyCount > 0 ? '#fffbeb' : '#f8fafc' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, color: '#d97706' }}><Sparkles size={16}/> {translate('pos.dashboard.pending_cleanings')} ({dirtyCount})</Typography>
                            {dirtyRooms?.slice(0, 3).map(room => (
                                <Box key={room.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{translate('pos.dashboard.room')} {room.Identificador}</Typography>
                                    <ArrowRightCircle size={18} color="#f59e0b" />
                                </Box>
                            ))}
                            {dirtyCount === 0 && <Typography variant="caption" sx={{ color: '#94a3b8' }}>{translate('pos.dashboard.no_rooms_to_clean')}</Typography>}
                         </Card>

                         <Card sx={{ p: 2.5, borderRadius: '24px', border: lowStockCount > 0 ? '1px solid #fee2e2' : 'none', bgcolor: lowStockCount > 0 ? '#fffafb' : '#f8fafc' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, color: '#ef4444' }}><Package size={16}/> {translate('pos.dashboard.restock_alerts')} ({lowStockCount})</Typography>
                             {lowStockCount > 0 && lowStock?.slice(0, 3).map(item => (
                                <Box key={item.id} sx={{ py: 0.5 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{item.producto?.Nombre}</Typography>
                                    <Typography variant="caption" sx={{ color: '#ef4444', fontWeight: 700 }}>{translate('pos.stock_remaining', { count: item.Cantidad })}</Typography>
                                </Box>
                            ))}
                            {lowStockCount === 0 && !loadingStock && <Typography variant="caption" sx={{ color: '#94a3b8' }}>{translate('pos.dashboard.stock_sufficient')}</Typography>}
                         </Card>
                    </Stack>
                </Grid>
            </Grid>

            {/* Sección Caja y Mis Pagos — visible para todos */}
            <Grid container spacing={4} mt={1}>
                {/* Total de Caja */}
                <Grid item xs={12} md={4}>
                    <SectionHeader title={translate('pos.dashboard.active_cash')} icon={Wallet} color="#10b981" />
                    <Card sx={{ p: 3, borderRadius: '24px', background: ultimaCaja ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)' : '#f8fafc', border: '1px solid #a7f3d0' }}>
                        {loadingCaja ? <CircularProgress size={24} /> : ultimaCaja ? (
                            <>
                                <Typography variant="h4" sx={{ fontWeight: 800, color: '#065f46' }}>{fmt(Number(ultimaCaja.Saldo ?? 0))}</Typography>
                                <Typography variant="caption" sx={{ color: '#6b7280' }}>{translate('pos.dashboard.last_movement')}: {ultimaCaja.Concepto}</Typography>
                                <Typography variant="body2" sx={{ mt: 1, color: '#374151', fontWeight: 600 }}>
                                    {new Date(ultimaCaja.updatedAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </Typography>
                            </>
                        ) : (
                            <Typography variant="body2" color="text.secondary">{translate('pos.dashboard.no_cash_movements')}</Typography>
                        )}
                    </Card>
                </Grid>

                {/* Mis Pagos de Hoy */}
                <Grid item xs={12} md={8}>
                    <SectionHeader title={translate('pos.dashboard.my_payments_today')} icon={CreditCard} color="#6366f1" />
                    <Card sx={{ borderRadius: '24px', overflow: 'hidden' }}>
                        <Box sx={{ p: 2, bgcolor: '#eef2ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#4338ca' }}>
                                {misPagos?.length || 0} {translate('resources.pagos.name', { smart_count: misPagos?.length || 0 }).toLowerCase()}
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#4338ca' }}>{fmt(totalMisPagos)}</Typography>
                        </Box>
                        {loadingPagos ? (
                            <Box p={3} display="flex" justifyContent="center"><CircularProgress size={24} /></Box>
                        ) : (!misPagos || misPagos.length === 0) ? (
                            <Box p={3}><Typography variant="body2" color="text.secondary">{translate('pos.dashboard.no_payments_today')}</Typography></Box>
                        ) : (
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>{translate('pos.dashboard.room')}</TableCell>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>{translate('pos.dashboard.payment_method')}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>{translate('pos.dashboard.amount')}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {misPagos?.map(p => (
                                        <TableRow key={p.id} hover>
                                            <TableCell sx={{ fontSize: '0.8rem' }}>{p.turno?.habitacion?.Identificador || '—'}</TableCell>
                                            <TableCell sx={{ fontSize: '0.8rem' }}>{p.formaPago?.Tipo || '—'}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{fmt(Number(p.Importe || 0))}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default OperatorDashboard;
