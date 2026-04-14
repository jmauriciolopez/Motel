import React, { useState, useEffect, useCallback } from 'react';
import { AppBar, UserMenu, useDataProvider, useTranslate } from 'react-admin';
import { Typography, Box, useMediaQuery, IconButton, Tooltip, Badge, Menu, MenuItem, ListItemIcon, ListItemText, Divider, CircularProgress } from '@mui/material';
import { Bell, Search, Settings, Sparkles, Wrench, Package, Clock, AlertTriangle, CheckCircle2, X, ChevronDown, Building2, Languages } from 'lucide-react';
import { Cookies } from '../helpers/Utils';
import { Link } from 'react-router-dom';
import { useMotel } from '../context/MotelContext';
import LanguageSwitcher from './LanguageSwitcher';

const ModernAppBar = (props) => {
    const translate = useTranslate();
    const isSmall = useMediaQuery(theme => theme.breakpoints.down('sm'));
    const { currentMotelId, availableMoteles, changeMotel } = useMotel();

    const [anchorEl, setAnchorEl] = useState(null);
    const [motelAnchorEl, setMotelAnchorEl] = useState(null);
    const motelButtonRef = React.useRef(null);

    const openMenu = Boolean(anchorEl);
    const openMotelMenu = Boolean(motelAnchorEl);

    const handleMotelMenuClose = () => {
        setMotelAnchorEl(null);
        // Devolver foco al trigger para evitar aria-hidden warning de MUI
        setTimeout(() => motelButtonRef.current?.focus(), 0);
    };

    const currentMotel = availableMoteles.find(m => m.id === currentMotelId) || availableMoteles[0];
    const getMotelNombre = (m) => m?.nombre || m?.Nombre || '—';

    const dataProvider = useDataProvider();
    const [notifications, setNotifications] = useState({
        clean: { data: [], total: 0 },
        maint: { data: [], total: 0 },
        stock: { data: [], total: 0 },
        expiry: { data: [], total: 0 }
    });
    const [loading, setLoading] = useState(false);
    const [dismissedIds, setDismissedIds] = useState(() => {
        try {
            const saved = localStorage.getItem('dismissed_notifications');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    const fetchNotifications = React.useCallback(async () => {
        const isOnboarding = window.location.hash.includes('onboarding');
        const isSignup = window.location.hash.startsWith('#/signup');

        if (!currentMotelId || isOnboarding || isSignup) return;

        // No fetchear hasta que el motel haya completado el onboarding
        const motelListo = currentMotel?.onboardingCompleto === true ||
            currentMotel?.Onboardingcompleto === true ||
            currentMotel?.Onboarding_Completed === true;

        if (!motelListo) return;
        setLoading(true);
        try {
            const now = new Date();
            const in30Mins = new Date(now.getTime() + 30 * 60000).toISOString();

            const results = await Promise.allSettled([
                dataProvider.getList('habitaciones', {
                    filter: { Estado: 'LIMPIEZA', motelId: currentMotelId },
                    pagination: { page: 1, perPage: 20 },
                    sort: { field: 'id', order: 'DESC' }
                }),
                dataProvider.getList('mantenimientos', {
                    filter: { motelId: currentMotelId, Finalizado: false },
                    pagination: { page: 1, perPage: 20 },
                    sort: { field: 'id', order: 'DESC' }
                }),
                dataProvider.getList('stocks', {
                    filter: { motelId: currentMotelId },
                    pagination: { page: 1, perPage: 20 },
                    sort: { field: 'id', order: 'DESC' }
                }),
                dataProvider.getList('turnos', {
                    filter: { 
                        motelId: currentMotelId, 
                        Estado: 'ABIERTO'
                    },
                    pagination: { page: 1, perPage: 20 },
                    sort: { field: 'Salida', order: 'ASC' }
                })
            ]);

            const [clean, maint, stock, expiry] = results;

            setNotifications(prev => ({
                clean: clean.status === 'fulfilled' ? { data: clean.value.data, total: clean.value.total } : prev.clean,
                maint: maint.status === 'fulfilled' ? { data: maint.value.data, total: maint.value.total } : prev.maint,
                stock: stock.status === 'fulfilled' ? { data: stock.value.data, total: stock.value.total } : prev.stock,
                expiry: expiry.status === 'fulfilled' ? { data: expiry.value.data, total: expiry.value.total } : prev.expiry
            }));

            // Log failures for debugging without breaking the UI
            results.forEach((res, idx) => {
                if (res.status === 'rejected') {
                    const names = ['clean', 'maint', 'stock', 'expiry'];
                    strapi?.log?.warn?.(`Notification fetch failed for ${names[idx]}`);
                }
            });

        } catch (error) {
            // silently fail — notifications are non-critical
        } finally {
            setLoading(false);
        }
    }, [dataProvider, currentMotelId, currentMotel]);

    React.useEffect(() => {
        fetchNotifications();
        const timer = Number(import.meta.env.VITE_NOTIFICATIONS_REFRESH_MS) || 60000;
        const interval = setInterval(fetchNotifications, timer);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    // Filtrar notificaciones que ya fueron descartadas
    const activeClean = notifications.clean.data.filter(i => !dismissedIds.includes(i.id || i.id));
    const activeMaint = notifications.maint.data.filter(i => !dismissedIds.includes(i.id || i.id));
    const activeStock = notifications.stock.data.filter(i => !dismissedIds.includes(i.id || i.id));
    const activeExpiry = notifications.expiry.data.filter(i => !dismissedIds.includes(i.id || i.id));

    const totalAlerts = activeClean.length + activeMaint.length + activeStock.length + activeExpiry.length;

    const handleOpen = (event) => setAnchorEl(event.currentTarget);
    const handleClose = () => setAnchorEl(null);

    const handleDismiss = (e, id) => {
        e.stopPropagation();
        const newDismissed = [...dismissedIds, id];
        setDismissedIds(newDismissed);
        localStorage.setItem('dismissed_notifications', JSON.stringify(newDismissed));
    };

    const handleClearAll = () => {
        const allIds = [
            ...notifications.clean.data.map(i => i.id || i.id),
            ...notifications.maint.data.map(i => i.id || i.id),
            ...notifications.stock.data.map(i => i.id || i.id),
            ...notifications.expiry.data.map(i => i.id || i.id)
        ];
        const newDismissed = Array.from(new Set([...dismissedIds, ...allIds]));
        setDismissedIds(newDismissed);
        localStorage.setItem('dismissed_notifications', JSON.stringify(newDismissed));
    };

    return (
        <AppBar
            {...props}
            userMenu={<UserMenu />}
            sx={{
                background: '#1e1b4b !important',
                color: '#ffffff',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                px: 2,
            }}
        >
            <Box flex="1" display="flex" alignItems="center">
                {!isSmall && (
                    <Typography
                        variant="h6"
                        sx={{
                            fontWeight: 800,
                            fontFamily: "'Outfit', sans-serif",
                            color: '#818cf8',
                            mr: 2,
                            display: 'flex',
                            alignItems: 'center',
                        }}
                    >
                        {translate('pos.app_title')}
                    </Typography>
                )}

                {/* Selector de Motel */}
                <Box sx={{ display: 'flex', alignItems: 'center', ml: isSmall ? 0 : 1 }}>
                    <Tooltip title={availableMoteles.length > 1 ? translate('pos.change_motel') : ""}>
                        <Box
                            ref={motelButtonRef}
                            onClick={(e) => availableMoteles.length > 1 && setMotelAnchorEl(e.currentTarget)}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                bgcolor: 'rgba(255,255,255,0.05)',
                                px: 1.5,
                                py: 0.5,
                                borderRadius: '8px',
                                cursor: availableMoteles.length > 1 ? 'pointer' : 'default',
                                border: '1px solid rgba(255,255,255,0.1)',
                                transition: 'all 0.2s',
                                '&:hover': availableMoteles.length > 1 ? {
                                    bgcolor: 'rgba(255,255,255,0.1)',
                                    borderColor: 'rgba(255,255,255,0.2)'
                                } : {}
                            }}
                        >
                            <Building2 size={16} style={{ marginRight: 8, color: '#818cf8' }} />
                            <Typography
                                variant="body2"
                                sx={{
                                    fontWeight: 700,
                                    color: '#ffffff',
                                    fontFamily: "'Outfit', sans-serif",
                                    maxWidth: isSmall ? 100 : 200,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                            {getMotelNombre(currentMotel) !== '—' ? getMotelNombre(currentMotel) : translate('pos.select_motel')}
                            </Typography>
                            {availableMoteles.length > 1 && (
                                <ChevronDown size={14} style={{ marginLeft: 4, opacity: 0.5 }} />
                            )}
                        </Box>
                    </Tooltip>

                    <Menu
                        anchorEl={motelAnchorEl}
                        open={openMotelMenu}
                        onClose={handleMotelMenuClose}
                        disableRestoreFocus
                        PaperProps={{
                            sx: {
                                mt: 1,
                                borderRadius: '12px',
                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                minWidth: 180
                            }
                        }}
                    >
                        {availableMoteles.map((motel) => {
                            const mId = motel.id;
                            const isSelected = mId === currentMotelId;
                            return (
                                <MenuItem
                                    key={mId}
                                    selected={isSelected}
                                    onClick={() => {
                                        changeMotel(mId);
                                        handleMotelMenuClose();
                                    }}
                                    sx={{
                                        fontWeight: isSelected ? 700 : 400,
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    {getMotelNombre(motel)}
                                </MenuItem>
                            );
                        })}
                    </Menu>
                </Box>

                <Typography
                    variant="h6"
                    id="react-admin-title"
                    sx={{
                        fontWeight: 600,
                        fontFamily: "'Outfit', sans-serif",
                        color: '#ffffff',
                        ml: 2,
                        '&:before': {
                            content: '"|"',
                            mr: 2,
                            color: 'rgba(255,255,255,0.2)',
                            fontWeight: 300
                        }
                    }}
                />
            </Box>

            <Box display="flex" alignItems="center" gap={0.5}>
                <Tooltip title={translate('pos.notifications')}>
                    <IconButton
                        onClick={handleOpen}
                        sx={{ color: '#e0e7ff', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
                    >
                        <Badge badgeContent={totalAlerts} color="error" overlap="circular">
                            <Bell size={20} />
                        </Badge>
                    </IconButton>
                </Tooltip>

                <Menu
                    anchorEl={anchorEl}
                    open={openMenu}
                    onClose={handleClose}
                    PaperProps={{
                        sx: {
                            mt: 1.5,
                            borderRadius: '16px',
                            width: 320,
                            maxHeight: 480,
                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                            border: '1px solid #f1f5f9'
                        }
                    }}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                    <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{translate('pos.notifications')}</Typography>
                        {totalAlerts > 0 && (
                            <Typography
                                onClick={handleClearAll}
                                variant="caption"
                                sx={{ color: 'primary.main', fontWeight: 600, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                            >
                                {translate('pos.clear_all')}
                            </Typography>
                        )}
                    </Box>
                    <Divider />

                    {loading ? (
                        <Box p={4} display="flex" justifyContent="center"><CircularProgress size={24} /></Box>
                    ) : totalAlerts === 0 ? (
                        <Box p={4} textAlign="center">
                            <CheckCircle2 size={32} style={{ color: '#10b981', opacity: 0.5, marginBottom: 8 }} />
                            <Typography variant="body2" color="text.secondary">{translate('pos.all_up_to_date')}</Typography>
                        </Box>
                    ) : (
                        <Box sx={{ maxHeight: 350, overflowY: 'auto' }}>
                            {/* Limpieza */}
                            {activeClean?.map(room => (
                                <MenuItem key={room.id} onClick={() => { handleClose(); window.location.hash = `/habitaciones?filter=${JSON.stringify({ id: room.id || room.id })}&order=DESC&page=1&perPage=10&sort=id`; }}>
                                    <ListItemIcon><Sparkles size={18} color="#f59e0b" /></ListItemIcon>
                                    <ListItemText
                                        primary={translate('pos.clean_notification', { id: room.Identificador })}
                                        secondary={translate('pos.clean_pending')}
                                        primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                                    />
                                    <IconButton size="small" onClick={(e) => handleDismiss(e, room.id || room.id)}>
                                        <X size={14} />
                                    </IconButton>
                                </MenuItem>
                            ))}

                            {/* Mantenimiento */}
                            {activeMaint?.map(m => (
                                <MenuItem key={m.id} onClick={() => { handleClose(); window.location.hash = '/mantenimientos'; }}>
                                    <ListItemIcon><Wrench size={18} color="#ef4444" /></ListItemIcon>
                                    <ListItemText
                                        primary={translate('pos.maint_notification', { id: m.habitacion?.Identificador || '---' })}
                                        secondary={m.Observacion?.substring(0, 30) + '...'}
                                        primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                                    />
                                    <IconButton size="small" onClick={(e) => handleDismiss(e, m.id || m.id)}>
                                        <X size={14} />
                                    </IconButton>
                                </MenuItem>
                            ))}

                            {/* Stock */}
                            {activeStock?.map(s => (
                                <MenuItem key={s.id} onClick={() => { handleClose(); window.location.hash = '/stocks'; }}>
                                    <ListItemIcon><Package size={18} color="#6366f1" /></ListItemIcon>
                                    <ListItemText
                                        primary={translate('pos.stock_low', { name: s.producto?.Nombre })}
                                        secondary={translate('pos.stock_remaining', { count: s.Cantidad })}
                                        primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                                    />
                                    <IconButton size="small" onClick={(e) => handleDismiss(e, s.id || s.id)}>
                                        <X size={14} />
                                    </IconButton>
                                </MenuItem>
                            ))}

                            {/* Vencimiento */}
                            {activeExpiry?.map(t => (
                                <MenuItem key={t.id} onClick={() => { handleClose(); window.location.hash = `/turnos/${t.id || t.id}`; }}>
                                    <ListItemIcon><Clock size={18} color="#ec4899" /></ListItemIcon>
                                    <ListItemText
                                        primary={translate('pos.expiry_notification', { id: t.habitacion?.Identificador })}
                                        secondary={translate('pos.expiry_time', { time: new Date(t.Salida).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })}
                                        primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                                    />
                                    <IconButton size="small" onClick={(e) => handleDismiss(e, t.id || t.id)}>
                                        <X size={14} />
                                    </IconButton>
                                </MenuItem>
                            ))}
                        </Box>
                    )}

                    <Divider />
                    <Box p={1} textAlign="center">
                        <Typography variant="caption" color="text.secondary">{translate('pos.alerts_footer')}</Typography>
                    </Box>
                </Menu>

                <Tooltip title={translate('pos.settings')}>
                    <IconButton 
                        component={Link}
                        to={`/moteles/${currentMotelId}`}
                        sx={{ color: '#e0e7ff', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
                    >
                        <Settings size={20} />
                    </IconButton>
                </Tooltip>
            </Box>
        </AppBar>
    );
};

export default ModernAppBar;
