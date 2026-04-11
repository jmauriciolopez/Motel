import React, { useMemo, useState } from 'react';
import {
    Title,
    useGetList,
    Loading,
    Error,
    ExportButton,
    TopToolbar
} from 'react-admin';
import {
    Card,
    CardContent,
    Grid,
    Typography,
    Box,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    InputAdornment,
    IconButton,
    Tooltip
} from '@mui/material';
import { 
    ShoppingCart, 
    AlertTriangle, 
    TrendingUp, 
    Package, 
    Download, 
    Printer,
    Search,
    Info,
    Calendar
} from 'lucide-react';
import { useMotel } from '../context/MotelContext';

const ListaCompras = () => {
    const [search, setSearch] = useState('');
    const [diasCobertura, setDiasCobertura] = useState(15);

    const { data: productos, isLoading: loadingProd } = useGetList('productos', {
        pagination: { page: 1, perPage: 500 },
    });

    const { data: stocks, isLoading: loadingStock } = useGetList('stocks', {
        pagination: { page: 1, perPage: 1000 },
    });

    const consumosFilter = useMemo(() => {
        const hace30dias = new Date();
        hace30dias.setDate(hace30dias.getDate() - 30);
        return {
            'turno.Salida': { $gte: hace30dias.toISOString() }
        };
    }, []);
    
    const { data: consumos, isLoading: loadingConsumo } = useGetList('consumos', {
        filter: consumosFilter,
        pagination: { page: 1, perPage: 3000 },
    });

    // 4. Procesamiento de Datos
    const shoppingList = useMemo(() => {
        if (!productos || !stocks || !consumos) return [];

        // Agrupar Stock Actual por Producto
        const stockMap = {};
        stocks.forEach(s => {
            const pId = s.producto?.id || s.producto?.id;
            stockMap[pId] = (stockMap[pId] || 0) + (s.Cantidad || 0);
        });

        // Agrupar Consumo 30d por Producto
        const consumoMap = {};
        consumos.forEach(c => {
            const pId = c.producto?.id || c.producto?.id;
            consumoMap[pId] = (consumoMap[pId] || 0) + (c.Cantidad || 0);
        });

        return productos.map(p => {
            const currentStock = stockMap[p.id] || 0;
            const minStock = p.StockMinimo || 0;
            const consumed30d = consumoMap[p.id] || 0;
            const avgDaily = consumed30d / 30;
            
            // Lógica de Sugerencia:
            // 1. Reponer lo necesario para llegar al mín (si está por debajo)
            const deficit = Math.max(0, minStock - currentStock);
            // 2. Sumar stock de seguridad para los próximos N días
            const safetyStock = Math.ceil(avgDaily * diasCobertura);
            
            const suggested = deficit + safetyStock;

            return {
                id: p.id,
                nombre: p.Nombre,
                currentStock,
                minStock,
                consumed30d,
                avgDaily,
                suggested,
                isLow: currentStock < minStock,
                precio: p.Precio || 0
            };
        })
        .filter(item => {
            const matchesSearch = item.nombre.toLowerCase().includes(search.toLowerCase());
            // Solo mostrar si se sugiere comprar algo o si está bajo el mín
            return matchesSearch && (item.suggested > 0 || item.isLow);
        })
        .sort((a, b) => {
            // Priorizar los que están bajos de stock
            if (a.isLow && !b.isLow) return -1;
            if (!a.isLow && b.isLow) return 1;
            return b.suggested - a.suggested;
        });

    }, [productos, stocks, consumos, search, diasCobertura]);

    if (loadingProd || loadingStock || loadingConsumo) return <Loading />;

    const totalInversion = shoppingList.reduce((acc, curr) => acc + (curr.suggested * curr.precio), 0);

    const handlePrint = () => {
        window.print();
    };

    return (
        <Box sx={{ p: 4, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
            <Title title="Lista de Compras Optimizada" />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }} className="no-print">
                <Box>
                    <Typography variant="h4" fontWeight={800} color="#1e293b">
                        Lista de Compras Inteligente
                    </Typography>
                    <Typography variant="body1" color="textSecondary">
                        Sugerencias de reposición basadas en rotación real de los últimos 30 días
                    </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <IconButton onClick={handlePrint} sx={{ bgcolor: '#fff', boxShadow: 1 }}>
                        <Printer size={20} />
                    </IconButton>
                    <IconButton onClick={() => {}} sx={{ bgcolor: '#fff', boxShadow: 1 }}>
                        <Download size={20} />
                    </IconButton>
                </Box>
            </Box>

            <Grid container spacing={3}>
                {/* Panel de Control */}
                <Grid item xs={12} md={4} className="no-print">
                    <Card sx={{ borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <CardContent>
                            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                                Configurar Cobertura
                            </Typography>
                            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Calendar size={20} color="#6366f1" />
                                <TextField
                                    label="Días de Stock deseados"
                                    type="number"
                                    variant="outlined"
                                    size="small"
                                    value={diasCobertura}
                                    onChange={(e) => setDiasCobertura(Number(e.target.value))}
                                    helperText="Días de operación que quieres cubrir con esta compra"
                                    fullWidth
                                />
                            </Box>
                            
                            <TextField
                                fullWidth
                                label="Buscar Producto"
                                variant="outlined"
                                size="small"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Search size={18} />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </CardContent>
                    </Card>

                    <Card sx={{ mt: 2, borderRadius: 4, bgcolor: '#6366f1', color: '#fff' }}>
                        <CardContent>
                            <Typography variant="overline" sx={{ opacity: 0.8 }}>Inversión Estimada</Typography>
                            <Typography variant="h4" fontWeight={800}>
                                {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(totalInversion)}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                                Basado en precios actuales de {shoppingList.length} productos
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Tabla de Resultados */}
                <Grid item xs={12} md={8}>
                    <TableContainer component={Paper} sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                        <Table>
                            <TableHead sx={{ backgroundColor: '#f1f5f9' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700 }}>Producto</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700 }}>Stock Act.</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700 }}>Stock Mín.</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700 }}>Rotación (30d)</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#e0f2fe' }}>Comprar</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {shoppingList.map((row) => (
                                    <TableRow key={row.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell component="th" scope="row">
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {row.isLow && (
                                                    <Tooltip title="Stock por debajo del mínimo">
                                                        <AlertTriangle size={16} color="#ef4444" />
                                                    </Tooltip>
                                                )}
                                                <Typography fontWeight={600}>{row.nombre}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip 
                                                label={row.currentStock} 
                                                size="small" 
                                                color={row.isLow ? "error" : "default"} 
                                                variant={row.isLow ? "filled" : "outlined"}
                                            />
                                        </TableCell>
                                        <TableCell align="center" sx={{ color: 'text.secondary' }}>
                                            {row.minStock}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <Typography variant="body2" fontWeight={700}>{row.consumed30d}</Typography>
                                                <Typography variant="caption" color="textSecondary">{row.avgDaily.toFixed(1)}/día</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell align="right" sx={{ bgcolor: '#f0f9ff' }}>
                                            <Typography variant="h6" fontWeight={800} color="#0369a1">
                                                {row.suggested}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {shoppingList.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                                            <Package size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                                            <Typography variant="h6" color="textSecondary">
                                                Todo está en orden. No hay compras sugeridas.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    
                    <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1, p: 2, bgcolor: '#fff', borderRadius: 4 }} className="no-print">
                        <Info size={16} color="#64748b" />
                        <Typography variant="caption" color="textSecondary">
                            La cantidad sugerida incluye el faltante para llegar al stock mínimo más el consumo estimado para los próximos {diasCobertura} días.
                        </Typography>
                    </Box>
                </Grid>
            </Grid>
            
            <style>
                {`
                    @media print {
                        .no-print { display: none !important; }
                        body { background: white !important; }
                        .MuiPaper-root { box-shadow: none !important; border: 1px solid #eee !important; }
                    }
                `}
            </style>
        </Box>
    );
};

export default ListaCompras;
