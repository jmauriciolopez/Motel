import React, { useState, useMemo } from 'react';
import { useGetList, Title, Loading, Error } from 'react-admin';
import { 
    Card, 
    CardContent, 
    Typography, 
    Grid, 
    Box, 
    TextField, 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableRow,
    Paper,
    Divider
} from '@mui/material';
import { TrendingUp, Calendar, Home, ShoppingCart, Award, Wallet, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMotel } from '../context/MotelContext';

const StatCard = ({ title, value, icon, color }) => (
    <Card sx={{ height: '100%', borderRadius: '16px', boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)' }}>
        <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                    <Typography color="textSecondary" variant="overline" fontWeight="700">
                        {title}
                    </Typography>
                    <Typography variant="h4" fontWeight="800" sx={{ mt: 1 }}>
                        {value}
                    </Typography>
                </Box>
                <Box 
                    sx={{ 
                        backgroundColor: `${color}15`, 
                        padding: '12px', 
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    {React.cloneElement(icon, { color: color, size: 28 })}
                </Box>
            </Box>
        </CardContent>
    </Card>
);

const ReporteIngresos = () => {
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

    const turnosFilter = useMemo(() => ({
        Salida: {
            $gte: `${filterDate}T00:00:00.000Z`,
            $lte: `${filterDate}T23:59:59.999Z`
        },
        Estado: 'Cerrado',
    }), [filterDate]);

    const { data, isLoading, error } = useGetList('turnos', {
        pagination: { page: 1, perPage: 1000 },
        sort: { field: 'id', order: 'DESC' },
        filter: turnosFilter
    });

    const insumosFilter = useMemo(() => ({
        Fecha: {
            $gte: `${filterDate}T00:00:00.000Z`,
            $lte: `${filterDate}T23:59:59.999Z`
        },
    }), [filterDate]);

    // Nueva consulta para insumos consumidos (amenidades internas)
    const { data: insumosConsumidosData, isLoading: isLoadingInsumos } = useGetList('insumodetalles', {
        pagination: { page: 1, perPage: 1000 },
        sort: { field: 'id', order: 'DESC' },
        filter: insumosFilter
    });

    const stats = useMemo(() => {
        if (!data) return null;

        let totalPagado = 0;
        let cantidadTurnos = data.length;
        const ocupacionPorHab = {};
        const consumosPorProd = {};
        const pagosPorForma = {};

        data.forEach(turno => {
            // Ocupación
            const habId = turno.habitacion?.Identificador || 'S/N';
            if (!ocupacionPorHab[habId]) {
                ocupacionPorHab[habId] = { count: 0, total: 0 };
            }
            ocupacionPorHab[habId].count += 1;
            ocupacionPorHab[habId].total += Number(turno.Total || 0);

            // Consumos de venta (Productos)
            if (turno.consumos && Array.isArray(turno.consumos)) {
                turno.consumos.forEach(c => {
                    const prodName = c.producto?.Nombre || 'Desconocido';
                    if (!consumosPorProd[prodName]) {
                        consumosPorProd[prodName] = { cant: 0, total: 0 };
                    }
                    consumosPorProd[prodName].cant += c.Cantidad || 0;
                    consumosPorProd[prodName].total += Number(c.Importe || 0);
                });
            }

            // Pagos (Relation in Turno is singular: pago)
            if (turno.pago) {
                const type = turno.pago.formaPago?.Tipo || 'Efectivo';
                const monto = Number(turno.pago.Importe || 0);
                if (!pagosPorForma[type]) {
                    pagosPorForma[type] = 0;
                }
                pagosPorForma[type] += monto;
                totalPagado += monto;
            }
        });

        // Procesar Insumos Consumidos (Internos)
        const insumosAgrupados = {};
        if (insumosConsumidosData) {
            insumosConsumidosData.forEach(inv => {
                const prodName = inv.producto?.Nombre || 'Sin nombre';
                if (!insumosAgrupados[prodName]) {
                    insumosAgrupados[prodName] = 0;
                }
                insumosAgrupados[prodName] += inv.Cantidad || 0;
            });
        }

        // Top Habitaciones
        const topHabitaciones = Object.entries(ocupacionPorHab)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Resumen Consumos
        const resumenConsumos = Object.entries(consumosPorProd)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.total - a.total);

        // Resumen Pagos (Distribution)
        const paymentDistribution = Object.entries(pagosPorForma)
            .sort((a, b) => b[1] - a[1]);

        return {
            totalFacturado: totalPagado,
            cantidadTurnos,
            ocupacionPorHab: Object.entries(ocupacionPorHab).map(([name, data]) => ({ name, ...data })),
            resumenConsumos,
            insumosConsumidos: Object.entries(insumosAgrupados).map(([name, cant]) => ({ name, cant })),
            topHabitaciones,
            paymentDistribution
        };
    }, [data, insumosConsumidosData]);

    const PaymentDistributionCard = ({ distribution, total }) => {
        return (
            <Paper sx={{ p: 0, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)', height: '100%' }}>
                <Box p={3} display="flex" alignItems="center">
                    <Wallet size={20} style={{ marginRight: '10px' }} />
                    <Typography variant="h6" fontWeight="700">Distribución de Pagos</Typography>
                </Box>
                <Divider />
                <Box p={3} display="flex" flexDirection="column" gap={2}>
                    {distribution.map(([type, amount]) => {
                        const pct = total > 0 ? (amount / total) * 100 : 0;
                        return (
                            <Box key={type}>
                                <Box display="flex" justifyContent="space-between" mb={0.5}>
                                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>{type}</Typography>
                                    <Typography variant="caption" sx={{ fontWeight: 800 }}>$ {amount.toLocaleString()}</Typography>
                                </Box>
                                <Box sx={{ width: '100%', height: '8px', bgcolor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${pct}%` }}
                                        transition={{ duration: 1 }}
                                        style={{ 
                                            height: '100%', 
                                            background: type.toLowerCase().includes('efectivo') ? '#10b981' : '#6366f1',
                                            borderRadius: '4px' 
                                        }}
                                    />
                                </Box>
                            </Box>
                        );
                    })}
                    {distribution.length === 0 && (
                        <Typography variant="body2" sx={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', py: 2 }}>
                            Sin datos registrados
                        </Typography>
                    )}
                </Box>
            </Paper>
        );
    };

    if (isLoading || isLoadingInsumos) return <Loading />;
    if (error) return <Error />;

    return (
        <Box sx={{ p: 3, maxWidth: '1200px', margin: '0 auto' }}>
            <Title title="Reporte de Ingresos" />
            
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Typography variant="h4" fontWeight="800" color="primary.main">
                    Reporte Operacional
                </Typography>
                <TextField
                    label="Fecha de Reporte"
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    variant="outlined"
                    size="small"
                    sx={{ backgroundColor: 'white', borderRadius: '8px', minWidth: '200px' }}
                />
            </Box>

            <Grid container spacing={3} mb={4}>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard 
                        title="Total Facturado" 
                        value={`$${stats?.totalFacturado.toLocaleString()}`} 
                        icon={<TrendingUp />} 
                        color="#10b981" 
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard 
                        title="Cantidad de Turnos" 
                        value={stats?.cantidadTurnos} 
                        icon={<Calendar />} 
                        color="#3b82f6" 
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard 
                        title="Promedio por Turno" 
                        value={`$${stats?.cantidadTurnos > 0 ? (stats.totalFacturado / stats.cantidadTurnos).toFixed(0).toLocaleString() : 0}`} 
                        icon={<Award />} 
                        color="#f59e0b" 
                    />
                </Grid>
            </Grid>

            {/* Fila central: Distribución de pagos y Consumos vendidos */}
            <Grid container spacing={3} mb={4}>
                <Grid item xs={12} md={6}>
                    <PaymentDistributionCard 
                        distribution={stats?.paymentDistribution || []} 
                        total={stats?.totalFacturado || 0} 
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 0, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)', height: '100%' }}>
                        <Box p={3} display="flex" alignItems="center">
                            <ShoppingCart size={20} style={{ marginRight: '10px' }} />
                            <Typography variant="h6" fontWeight="700">Ventas de Bar/Snack</Typography>
                        </Box>
                        <Divider />
                        <Table size="small">
                            <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Producto</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Cant.</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Monto</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {stats?.resumenConsumos.length > 0 ? (
                                    stats.resumenConsumos.map((c) => (
                                        <TableRow key={c.name} hover>
                                            <TableCell>{c.name}</TableCell>
                                            <TableCell align="center">{c.cant}</TableCell>
                                            <TableCell align="right">${c.total.toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} align="center" sx={{ py: 2, color: 'text.secondary' }}>
                                            No hay ventas de bar
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Paper>
                </Grid>
            </Grid>

            {/* Nueva Fila: Insumos Consumidos (Amenidades) */}
            <Grid container spacing={3} mb={4}>
                <Grid item xs={12}>
                    <Paper sx={{ p: 0, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)' }}>
                        <Box p={3} display="flex" alignItems="center" bgcolor="primary.main" color="white">
                            <Package size={20} style={{ marginRight: '10px' }} />
                            <Typography variant="h6" fontWeight="700">Insumos y Amenidades Consumidas (Uso Interno)</Typography>
                        </Box>
                        <Divider />
                        <Grid container spacing={0}>
                            {stats?.insumosConsumidos.length > 0 ? (
                                stats.insumosConsumidos.map((ins, idx) => (
                                    <Grid item xs={12} sm={6} md={4} key={ins.name} sx={{ 
                                        p: 2, 
                                        borderBottom: '1px solid #f1f5f9',
                                        borderRight: { sm: idx % 2 === 0 ? '1px solid #f1f5f9' : 'none', md: idx % 3 !== 2 ? '1px solid #f1f5f9' : 'none' }
                                    }}>
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Typography variant="body2" fontWeight="600">{ins.name}</Typography>
                                            <Box sx={{ bgcolor: '#eff6ff', px: 1.5, py: 0.5, borderRadius: '20px' }}>
                                                <Typography variant="caption" sx={{ fontWeight: 800, color: '#1d4ed8' }}>
                                                    {ins.cant} u.
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Grid>
                                ))
                            ) : (
                                <Box p={4} textAlign="center" width="100%">
                                    <Typography variant="body2" color="textSecondary">No se registraron consumos de insumos para esta fecha</Typography>
                                </Box>
                            )}
                        </Grid>
                    </Paper>
                </Grid>
            </Grid>

            {/* Fila final: Detalles por habitación */}
            <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 0, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)', height: '100%' }}>
                        <Box p={3} display="flex" alignItems="center">
                            <Home size={20} style={{ marginRight: '10px' }} />
                            <Typography variant="h6" fontWeight="700">Ocupación por Habitación</Typography>
                        </Box>
                        <Divider />
                        <Table size="small">
                            <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Habitación</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Turnos</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Monto Generado</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {stats?.ocupacionPorHab.map((hab) => (
                                    <TableRow key={hab.name} hover>
                                        <TableCell sx={{ fontWeight: '500' }}>#{hab.name}</TableCell>
                                        <TableCell align="center">{hab.count}</TableCell>
                                        <TableCell align="right">${hab.total.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 0, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)', height: '100%' }}>
                        <Box p={3} display="flex" alignItems="center">
                            <Award size={20} style={{ marginRight: '10px' }} />
                            <Typography variant="h6" fontWeight="700">Top 5 Habitaciones</Typography>
                        </Box>
                        <Divider />
                        <Box p={2}>
                            {stats?.topHabitaciones.map((hab, idx) => (
                                <Box key={hab.name} display="flex" alignItems="center" mb={2}>
                                    <Box 
                                        sx={{ 
                                            width: 32, 
                                            height: 32, 
                                            borderRadius: '50%', 
                                            backgroundColor: idx === 0 ? '#fbbf24' : '#e2e8f0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            mr: 2,
                                            fontWeight: 'bold',
                                            fontSize: '0.8rem'
                                        }}
                                    >
                                        {idx + 1}
                                    </Box>
                                    <Box flexGrow={1}>
                                        <Typography variant="body2" fontWeight="600">Habitación #{hab.name}</Typography>
                                        <Typography variant="caption" color="textSecondary">{hab.count} turnos realizados</Typography>
                                    </Box>
                                    <Typography variant="body2" fontWeight="700">${hab.total.toLocaleString()}</Typography>
                                </Box>
                            ))}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ReporteIngresos;
