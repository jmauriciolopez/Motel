import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Grid, Button, CircularProgress,
    ToggleButton, ToggleButtonGroup, Divider, Alert,
    InputAdornment, TextField as MuiTextField, Chip,
} from '@mui/material';
import { TrendingUp, TrendingDown, Percent, CheckCircle } from 'lucide-react';
import { useNotify, useGetList, AutocompleteInput, ReferenceInput, SimpleForm, useTranslate } from 'react-admin';
import { http } from '../shared/api/HttpClient';

const REDONDEOS = [1, 10, 50, 100, 500];

const AjustePrecios = () => {
    const translate = useTranslate();
    const notify = useNotify();

    const [campo, setCampo] = useState('Precio');
    const [porcentaje, setPorcentaje] = useState('');
    const [redondeo, setRedondeo] = useState(100);
    const [filtroRubroId, setFiltroRubroId] = useState('');
    const [filtroFacturable, setFiltroFacturable] = useState(null);
    const [loading, setLoading] = useState(false);
    const [resultado, setResultado] = useState(null);
    const [preview, setPreview] = useState([]);
    const [loadingPreview, setLoadingPreview] = useState(false);

    const { data: rubros = [] } = useGetList('rubros', {
        pagination: { page: 1, perPage: 100 },
        sort: { field: 'Nombre', order: 'ASC' },
    });

    // Preview: muestra cuántos productos se van a afectar
    useEffect(() => {
        if (!porcentaje || isNaN(porcentaje)) { setPreview([]); return; }
        const timer = setTimeout(async () => {
            setLoadingPreview(true);
            try {
                let url = `/productos`;
                const params: Record<string, any> = { _limit: 500 };
                if (filtroRubroId) params.rubroId = filtroRubroId;
                if (filtroFacturable !== null) params.Facturable = filtroFacturable;

                const data = await http.get(url, { params });
                const productos = data.data || [];
                const factor = 1 + Number(porcentaje) / 100;
                const r = redondeo;
                const round = (val) => val ? Math.round(Number(val) * factor / r) * r : val;

                setPreview(productos.slice(0, 5).map(p => ({
                    Nombre: p.Nombre,
                    precioActual: p.Precio,
                    costoActual: p.Costo,
                    precioNuevo: (campo === 'Precio' || campo === 'ambos') ? round(p.Precio) : p.Precio,
                    costoNuevo:  (campo === 'Costo'  || campo === 'ambos') ? round(p.Costo)  : p.Costo,
                    total: productos.length,
                })));
            } catch { setPreview([]); }
            finally { setLoadingPreview(false); }
        }, 600);
        return () => clearTimeout(timer);
    }, [porcentaje, campo, redondeo, filtroRubroId, filtroFacturable]);

    const handleAplicar = async () => {
        if (!porcentaje || isNaN(porcentaje)) {
            notify(translate('pos.pricing_adjustment.invalid_percent'), { type: 'warning' }); return;
        }
        setLoading(true);
        setResultado(null);
        try {
            const data = await http.post('/productos/ajuste-precios', {
                campo,
                porcentaje: Number(porcentaje),
                redondeo,
                ...(filtroRubroId && { filtroRubroId }),
                ...(filtroFacturable !== null && { filtroFacturable }),
            });
            setResultado(data.message);
            notify(data.message, { type: 'success' });
            setPorcentaje('');
            setPreview([]);
        } catch (err) {
            notify('Error: ' + err.message, { type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const pct = Number(porcentaje);
    const isPositive = pct > 0;

    return (
        <Box sx={{ maxWidth: 720, mx: 'auto', mt: 4, px: 2 }}>
            <Typography variant="h5" fontWeight={800} sx={{ mb: 3, color: '#1e1b4b' }}>
                {translate('pos.pricing_adjustment.title')}
            </Typography>

            <Paper sx={{ p: 3, borderRadius: '16px', mb: 3 }}>
                {/* Campo a ajustar */}
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>{translate('pos.pricing_adjustment.what_to_adjust')}</Typography>
                <ToggleButtonGroup
                    value={campo} exclusive
                    onChange={(_, v) => v && setCampo(v)}
                    sx={{ mb: 3 }}
                >
                    <ToggleButton value="Precio" sx={{ fontWeight: 700 }}>{translate('pos.pricing_adjustment.sell_price')}</ToggleButton>
                    <ToggleButton value="Costo"  sx={{ fontWeight: 700 }}>{translate('pos.pricing_adjustment.cost')}</ToggleButton>
                    <ToggleButton value="ambos"  sx={{ fontWeight: 700 }}>{translate('pos.pricing_adjustment.both')}</ToggleButton>
                </ToggleButtonGroup>

                {/* Porcentaje */}
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>{translate('pos.pricing_adjustment.adjustment_percent')}</Typography>
                <MuiTextField
                    type="number"
                    value={porcentaje}
                    onChange={e => setPorcentaje(e.target.value)}
                    placeholder={translate('pos.pricing_adjustment.percent_helper')}
                    fullWidth
                    sx={{ mb: 3 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                {isPositive
                                    ? <TrendingUp size={18} color="#10b981" />
                                    : <TrendingDown size={18} color="#ef4444" />}
                            </InputAdornment>
                        ),
                        endAdornment: <InputAdornment position="end"><Percent size={16} /></InputAdornment>,
                    }}
                />

                {/* Redondeo */}
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>{translate('pos.pricing_adjustment.round_to')}</Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                    {REDONDEOS.map(r => (
                        <Chip
                            key={r}
                            label={`$${r}`}
                            onClick={() => setRedondeo(r)}
                            color={redondeo === r ? 'primary' : 'default'}
                            variant={redondeo === r ? 'filled' : 'outlined'}
                            sx={{ fontWeight: 700, cursor: 'pointer' }}
                        />
                    ))}
                </Box>

                <Divider sx={{ mb: 3 }} />

                {/* Filtros opcionales */}
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                    {translate('pos.pricing_adjustment.filters_optional')}
                </Typography>
                <Grid container spacing={2} sx={{ mb: 1 }}>
                    <Grid item xs={12} md={6}>
                        <MuiTextField
                            select fullWidth size="small" label={translate('pos.pricing_adjustment.category')}
                            value={filtroRubroId}
                            onChange={e => setFiltroRubroId(e.target.value)}
                            SelectProps={{ native: true }}
                        >
                            <option value="">{translate('pos.pricing_adjustment.all_categories')}</option>
                            {rubros.map(r => (
                                <option key={r.id} value={r.id}>{r.Nombre}</option>
                            ))}
                        </MuiTextField>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <MuiTextField
                            select fullWidth size="small" label={translate('pos.pricing_adjustment.facturable')}
                            value={filtroFacturable === null ? '' : String(filtroFacturable)}
                            onChange={e => setFiltroFacturable(e.target.value === '' ? null : e.target.value === 'true')}
                            SelectProps={{ native: true }}
                        >
                            <option value="">{translate('pos.pricing_adjustment.all')}</option>
                            <option value="true">{translate('pos.pricing_adjustment.only_facturable')}</option>
                            <option value="false">{translate('pos.pricing_adjustment.only_non_facturable')}</option>
                        </MuiTextField>
                    </Grid>
                </Grid>
            </Paper>

            {/* Preview */}
            {porcentaje && !isNaN(pct) && (
                <Paper sx={{ p: 3, borderRadius: '16px', mb: 3, bgcolor: '#f8fafc' }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
                        {translate('pos.pricing_adjustment.preview')} {loadingPreview && <CircularProgress size={14} sx={{ ml: 1 }} />}
                        {preview[0] && (
                            <Chip
                                label={`${preview[0].total} ${translate('pos.pricing_adjustment.affected_products')}`}
                                size="small" color="primary" sx={{ ml: 2, fontWeight: 700 }}
                            />
                        )}
                    </Typography>
                    {preview.map((p, i) => (
                        <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid #e2e8f0' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>{p.Nombre}</Typography>
                            {(campo === 'Precio' || campo === 'ambos') && (
                                <Typography variant="body2" sx={{ color: isPositive ? 'error.main' : 'success.main', mx: 2 }}>
                                    ${p.precioActual?.toLocaleString()} → ${p.precioNuevo?.toLocaleString()}
                                </Typography>
                            )}
                            {(campo === 'Costo' || campo === 'ambos') && (
                                <Typography variant="body2" color="text.secondary">
                                    {translate('pos.pricing_adjustment.cost').toLowerCase()}: ${p.costoActual?.toLocaleString()} → ${p.costoNuevo?.toLocaleString()}
                                </Typography>
                            )}
                        </Box>
                    ))}
                    {preview.length === 0 && !loadingPreview && (
                        <Typography variant="body2" color="text.secondary">{translate('pos.pricing_adjustment.no_products')}</Typography>
                    )}
                </Paper>
            )}

            {resultado && (
                <Alert icon={<CheckCircle size={18} />} severity="success" sx={{ mb: 3, borderRadius: '12px' }}>
                    {resultado}
                </Alert>
            )}

            <Button
                variant="contained" size="large" fullWidth
                onClick={handleAplicar} disabled={loading || !porcentaje}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Percent size={20} />}
                sx={{ borderRadius: '12px', fontWeight: 800, py: 1.5 }}
            >
                {loading 
                    ? translate('pos.pricing_adjustment.applying') 
                    : `${translate('pos.pricing_adjustment.apply')} ${pct > 0 ? '+' : ''}${porcentaje || 0}% a ${
                        campo === 'ambos' 
                            ? translate('pos.pricing_adjustment.price_and_cost') 
                            : (campo === 'Precio' ? translate('pos.pricing_adjustment.sell_price') : translate('pos.pricing_adjustment.cost'))
                    }`}
            </Button>
        </Box>
    );
};

export default AjustePrecios;
