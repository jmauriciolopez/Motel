import React, { useRef, useMemo } from 'react';
import { useGetList, useGetOne, Loading, useTranslate } from 'react-admin';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Divider
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import { useMotel } from '../context/MotelContext';

const CuadroTarifario = () => {
    const translate = useTranslate();
    const { currentMotelId, availableMoteles } = useMotel();
    
    // Buscar el nombre del motel en la lista de moteles disponibles o usar el data del fetch
    const motelFromList = availableMoteles?.find(m => m.id === currentMotelId || m.id === currentMotelId);
    const currentMotelName = motelFromList?.Nombre || 'Motel';

    const { data: motelConfig, isLoading: isLoadingMotel } = useGetOne('moteles', { id: currentMotelId });

    const formatTime = (isoString) => {
        if (!isoString) return '-';
        try {
            // Strapi 5 might return just "HH:mm:ss" or a full ISO string
            if (typeof isoString === 'string' && isoString.length <= 8) return isoString.substring(0, 5);
            const date = new Date(isoString);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return isoString;
        }
    };

    const { data: tarifas, isLoading, error } = useGetList('tarifas', {
        pagination: { page: 1, perPage: 100 },
        sort: { field: 'Nombre', order: 'ASC' },
    });

    const printRef = useRef();

    const handlePrint = () => {
        const content = printRef.current.innerHTML;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Cuadro Tarifario - ${currentMotelName}</title>
                    <style>
                        body { font-family: 'Outfit', 'Inter', sans-serif; padding: 40px; color: #1e293b; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
                        th { background-color: #f8fafc; font-weight: bold; }
                        h1 { color: #1e293b; margin-bottom: 5px; }
                        .price { font-weight: bold; color: #0f172a; }
                        .promo { color: #ef4444; }
                        @media print {
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    ${content}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    if (isLoading || isLoadingMotel) return <Loading />;
    if (error) return <Typography color="error">{translate('pos.dashboard.error')}</Typography>;

    return (
        <Box p={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h4" fontWeight="800">{translate('pos.reports.pricing_grid')}</Typography>
                    <Typography variant="subtitle1" color="textSecondary">{currentMotelName}</Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<PrintIcon />}
                    onClick={handlePrint}
                    sx={{ borderRadius: '12px', px: 3, py: 1, textTransform: 'none', fontWeight: 600 }}
                >
                    {translate('pos.reports.print')} {translate('pos.reports.pricing_grid')}
                </Button>
            </Box>

            <Paper ref={printRef} elevation={0} sx={{ p: 4, borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                <Box mb={4} textAlign="center" className="no-print" sx={{ display: 'none' }}>
                    <Typography variant="h3" fontWeight={800}>{currentMotelName}</Typography>
                    <Typography variant="h6" color="primary">{translate('pos.reports.current_rates')}</Typography>
                </Box>

                <TableContainer>
                    <Table sx={{ minWidth: 650 }}>
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                <TableCell sx={{ fontWeight: 800 }}>{translate('pos.reports.category')}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800 }}>{translate('pos.dashboard.turn_price')}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800 }}>{translate('pos.reports.promotional')}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800 }}>{translate('pos.reports.daily_price')}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800 }}>{translate('pos.reports.exceed_price')} D</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800 }}>{translate('pos.reports.exceed_price')} N</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {tarifas.map((tarifa) => (
                                <TableRow key={tarifa.id} sx={{ '&:hover': { bgcolor: '#f1f5f9' } }}>
                                    <TableCell component="th" scope="row">
                                        <Typography fontWeight={700}>{tarifa.Nombre}</Typography>
                                    </TableCell>
                                    <TableCell align="right" className="price">
                                        ${new Intl.NumberFormat().format(tarifa.PrecioTurno)}
                                    </TableCell>
                                    <TableCell align="right" className="price promo">
                                        {tarifa.PrecioTurnoPromocional > 0 ? `$${new Intl.NumberFormat().format(tarifa.PrecioTurnoPromocional)}` : '-'}
                                    </TableCell>
                                    <TableCell align="right" className="price">
                                        ${new Intl.NumberFormat().format(tarifa.PrecioDiario)}
                                    </TableCell>
                                    <TableCell align="right">
                                        ${new Intl.NumberFormat().format(tarifa.PrecioHrDiaExcede)}
                                    </TableCell>
                                    <TableCell align="right">
                                        {tarifa.PrecioHrNocheExcede > 0 ? `$${new Intl.NumberFormat().format(tarifa.PrecioHrNocheExcede)}` : '-'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                {motelConfig && (
                    <Box mt={4} p={2} sx={{ bgcolor: '#f1f5f9', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <Grid container spacing={2}>
                            <Grid item xs={3}>
                                <Typography variant="body2" fontWeight={700}>{translate('pos.reports.checkin')} {translate('pos.reports.day_mode')}:</Typography>
                                <Typography variant="h6">{formatTime(motelConfig.InicioDia)} hs</Typography>
                            </Grid>
                            <Grid item xs={3}>
                                <Typography variant="body2" fontWeight={700}>{translate('pos.reports.checkin')} {translate('pos.reports.night_mode')}:</Typography>
                                <Typography variant="h6">{formatTime(motelConfig.InicioNoche)} hs</Typography>
                            </Grid>
                            <Grid item xs={2}>
                                <Typography variant="body2" fontWeight={700}>{translate('pos.reports.duration_short')}:</Typography>
                                <Typography variant="body2">{motelConfig.DuracionDiaria}h D / {motelConfig.DuracionNocturna}h N</Typography>
                            </Grid>
                            <Grid item xs={2}>
                                <Typography variant="body2" fontWeight={700}>{translate('pos.reports.tolerance')}:</Typography>
                                <Typography variant="h6">{motelConfig.Tolerancia} min</Typography>
                            </Grid>
                            <Grid item xs={2}>
                                <Typography variant="body2" fontWeight={700}>{translate('pos.reports.checkout')} {translate('pos.reports.day_mode')}:</Typography>
                                <Typography variant="h6">{formatTime(motelConfig.CheckOutDia)} hs</Typography>
                            </Grid>
                        </Grid>
                    </Box>
                )}

                <Box mt={6}>
                    <Typography variant="caption" color="textSecondary" display="block" textAlign="center">
                        {translate('pos.reports.price_note')}
                        <br />
                        {translate('pos.reports.generated_on')} {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                    </Typography>
                </Box>
            </Paper>

            {/* Visual preview as cards for a "Premium" feel when not printing */}
            <Box mt={6}>
                <Typography variant="h5" fontWeight={700} mb={3}>{translate('pos.reports.digital_preview')}</Typography>
                <Grid container spacing={3}>
                    {tarifas.map((tarifa) => (
                        <Grid item xs={12} md={6} lg={4} key={tarifa.id}>
                            <Paper sx={{
                                p: 3,
                                borderRadius: '24px',
                                border: '1px solid #e2e8f0',
                                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                                height: '100%',
                                transition: 'all 0.3s',
                                '&:hover': { transform: 'translateY(-5px)', boxShadow: '0 12px 24px -10px rgba(0,0,0,0.1)' }
                            }}>
                                <Typography variant="h6" fontWeight={800} color="primary" gutterBottom>
                                    {tarifa.Nombre}
                                </Typography>
                                <Divider sx={{ my: 1.5 }} />

                                <Box display="flex" justifyContent="space-between" mb={1}>
                                    <Typography color="textSecondary">Precio Turno:</Typography>
                                    <Typography fontWeight={700}>${new Intl.NumberFormat().format(tarifa.PrecioTurno)}</Typography>
                                </Box>

                                {tarifa.PrecioTurnoPromocional > 0 && (
                                    <Box display="flex" justifyContent="space-between" mb={1}>
                                        <Typography color="error">Promocional:</Typography>
                                        <Typography fontWeight={700} color="error">${new Intl.NumberFormat().format(tarifa.PrecioTurnoPromocional)}</Typography>
                                    </Box>
                                )}

                                <Box display="flex" justifyContent="space-between" mb={1}>
                                    <Typography color="textSecondary">Diario:</Typography>
                                    <Typography fontWeight={700}>${new Intl.NumberFormat().format(tarifa.PrecioDiario)}</Typography>
                                </Box>

                                <Box display="flex" justifyContent="space-between">
                                    <Typography color="textSecondary">Excedente Hr:</Typography>
                                    <Typography fontWeight={600}>${new Intl.NumberFormat().format(tarifa.PrecioHrDiaExcede)}</Typography>
                                </Box>
                                
                                <Divider sx={{ my: 1.5 }} />
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="textSecondary">Turno: {motelConfig?.DuracionDiaria}hs / {motelConfig?.DuracionNocturna}hs</Typography>
                                    <Typography variant="caption" color="textSecondary">Tol: {motelConfig?.Tolerancia} min</Typography>
                                </Box>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            </Box>
        </Box>
    );
};

export default CuadroTarifario;
