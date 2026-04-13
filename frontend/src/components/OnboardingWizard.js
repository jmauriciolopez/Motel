import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Paper, Stepper, Step, StepLabel,
    TextField as MuiTextField, Grid, CircularProgress, InputAdornment,
    Switch, FormControlLabel, Chip, Alert, Collapse,
} from '@mui/material';
import { useNotify, useDataProvider, useRefresh } from 'react-admin';
import { useMotel } from '../context/MotelContext';
import { Building2, User, Rocket, Package, CheckCircle2, Users, AlertCircle } from 'lucide-react';
import { Cookies, getApiUrl } from '../helpers/Utils';


const OnboardingWizard = ({ onFinish, mode = 'full' }) => {
    const { currentMotelId, setCurrentMotelId, setAvailableMoteles } = useMotel();
    const isTarifaOnly = mode === 'tarifa-only';

    const steps = isTarifaOnly
        ? ['Bienvenido', 'Tarifa', 'Habitaciones', 'Productos']
        : ['Bienvenido', 'Propietario', 'Tu Motel', 'Personal', 'Tarifa', 'Habitaciones', 'Productos'];

    const propietarioStep = isTarifaOnly ? -1 : 1;
    const motelStep = isTarifaOnly ? -1 : 2;
    const personalStep = isTarifaOnly ? -1 : 3;
    const tarifaStep = isTarifaOnly ? 1 : 4;
    const habitStep = isTarifaOnly ? 2 : 5;
    const productosStep = isTarifaOnly ? 3 : 6;

    const [activeStep, setActiveStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const [stepError, setStepError] = useState(''); // error visible dentro del modal

    const dataProvider = useDataProvider();
    const notify = useNotify();
    const refresh = useRefresh();

    // IDs de registros ya creados — para hacer PATCH si el usuario vuelve y modifica
    const [created, setCreated] = useState({
        propietarioId: null,  // id
        motelId: currentMotelId,
        tarifaId: null,
        habitacionesCreadas: false,
    });

    const [form, setForm] = useState({
        PropietarioNombre: '',
        PropietarioTelefono: '',
        PropietarioCUIT: '',
        PropietarioCiudad: '',
        MotelNombre: '',
        MotelDuracionTurno: '2',
        MotelHoraCierreCaja: '00:00',
        TarifaNombre: 'Estándar',
        PrecioTurno: '1500',
        PrecioDiario: '6000',
        PrecioHrDiaExcede: '500',
        HabitacionesCantidad: '10',
        HabitacionesPrefijo: 'A',
    });

    const [importarCatalogo, setImportarCatalogo] = useState(true);
    const [catalogoItems, setCatalogoItems] = useState([]);
    const [loadingCatalogo, setLoadingCatalogo] = useState(false);

    const [personal, setPersonal] = useState([
        { username: '', email: '', password: '', rol: 'Supervisor' },
        { username: '', email: '', password: '', rol: 'Recepcionista' },
    ]);

    useEffect(() => {
        if (activeStep !== productosStep) return;
        setLoadingCatalogo(true);
        const token = Cookies.getCookie('token');
        fetch(getApiUrl('/catalogo-productos?_page=1&_limit=8&_sort=Nombre&_order=asc'), {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.json())
            .then(data => {
                const items = Array.isArray(data) ? data : (data?.data || []);
                setCatalogoItems(items);
            })
            .catch(err => console.error('Error fetching catalog preview:', err))
            .finally(() => setLoadingCatalogo(false));

    }, [activeStep, productosStep]);

    const handleChange = (e) => {
        setStepError('');
        setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    };

    const validate = () => {
        if (!isTarifaOnly && activeStep === propietarioStep && !form.PropietarioNombre) {
            return 'El nombre del propietario es obligatorio';
        }
        if (!isTarifaOnly && activeStep === motelStep && (!form.MotelNombre || form.MotelNombre.trim().length < 3)) {
            return 'El nombre del motel debe tener al menos 3 caracteres';
        }
        if (activeStep === tarifaStep) {
            if (!form.TarifaNombre || !form.PrecioTurno || !form.PrecioDiario || !form.PrecioHrDiaExcede) {
                return 'Todos los campos de la tarifa son obligatorios';
            }
        }
        if (activeStep === habitStep) {
            if (!form.HabitacionesCantidad || !form.HabitacionesPrefijo) return 'Indicá cantidad y prefijo';
            if (parseInt(form.HabitacionesCantidad) > 50) return 'El máximo de habitaciones es 50';
        }
        return null;
    };

    // ── Guardar o actualizar el registro del paso actual ───────────────────────
    const saveStep = async () => {
        const token = Cookies.getCookie('token');
        let userId = Cookies.getCookie('userId');
        try {
            const u = JSON.parse(localStorage.getItem('user') || '{}');
            if (u?.id) userId = String(u.id);
        } catch { /* ignore */ }
        const motelId = created.motelId || currentMotelId;

        // PROPIETARIO
        if (!isTarifaOnly && activeStep === propietarioStep) {
            const data = {
                Nombre: form.PropietarioNombre,
                Email: Cookies.getCookie('email') || undefined,
                Activo: true,
                FormaPago: 'EFECTIVO',
                userId: userId || undefined,
                FechaVencimientoPrueba: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            };

            // Solo agregar campos opcionales si tienen valor
            if (form.PropietarioTelefono && form.PropietarioTelefono.trim()) {
                data.Telefono = form.PropietarioTelefono.trim();
            }
            if (form.PropietarioCUIT && form.PropietarioCUIT.trim()) {
                data.Cuit = form.PropietarioCUIT.trim();
            }
            if (form.PropietarioCiudad && form.PropietarioCiudad.trim()) {
                data.Ciudad = form.PropietarioCiudad.trim();
            }

            if (created.propietarioId) {
                await dataProvider.update('propietarios', { id: created.propietarioId, data });
            } else {
                const { data: p } = await dataProvider.create('propietarios', { data });
                setCreated(c => ({ ...c, propietarioId: p.id }));
            }
        }

        // MOTEL + DEPÓSITO
        if (!isTarifaOnly && activeStep === motelStep) {
            const motelData = {
                Nombre: form.MotelNombre.trim(),
                DuracionDiaria: parseInt(form.MotelDuracionTurno) || 2,
                DuracionNocturna: parseInt(form.MotelDuracionTurno) || 2,
            };

            if (created.motelId) {
                // PATCH — actualizar motel existente
                await dataProvider.update('moteles', { id: created.motelId, data: motelData });
            } else {
                // POST — crear motel nuevo
                if (!created.propietarioId) {
                    throw new Error('No se encontró el propietario. Volvé al paso «Propietario» y pulsá Siguiente de nuevo.');
                }
                const now = new Date();
                const userIds = userId ? [String(userId)] : [];
                const res = await fetch(getApiUrl('/moteles'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                        Nombre: form.MotelNombre.trim(),
                        DuracionDiaria: parseInt(form.MotelDuracionTurno) || 2,
                        DuracionNocturna: parseInt(form.MotelDuracionTurno) || 2,
                        HorarioUnico: false,
                        Tolerancia: 15,
                        MaxHrAdicional: 1,
                        InicioDia: new Date(new Date(now).setHours(8, 0, 0, 0)).toISOString(),
                        InicioNoche: new Date(new Date(now).setHours(20, 0, 0, 0)).toISOString(),
                        CheckOutDia: new Date(new Date(now).setHours(12, 0, 0, 0)).toISOString(),
                        propietarioId: created.propietarioId,
                        userIds,
                    }),
                });
                if (!res.ok) {
                    const text = await res.text();
                    let message = 'Error al crear el motel';
                    try {
                        const json = JSON.parse(text);
                        message = json.message || json.error || message;
                    } catch {
                        message = text || message;
                    }
                    throw new Error(message);
                }

                const motel = await res.json();
                const newMotelId = motel.id;
                setCreated(c => ({ ...c, motelId: newMotelId }));
                Cookies.setCookie('motel', newMotelId, 1);
                Cookies.setCookie('moteles', JSON.stringify([motel]), 1);
                setCurrentMotelId(newMotelId);
                setAvailableMoteles([motel]);

                const depRes = await Promise.all([
                    fetch(getApiUrl('/depositos'), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'x-motel-id': newMotelId },
                        body: JSON.stringify({ Nombre: 'Depósito Central', EsPrincipal: true, motelId: newMotelId }),
                    }),
                    fetch(getApiUrl('/depositos'), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'x-motel-id': newMotelId },
                        body: JSON.stringify({ Nombre: 'Depósito de Frente/Recepción', EsPrincipal: false, motelId: newMotelId }),
                    }),
                ]);
                for (const r of depRes) {
                    if (!r.ok) {
                        const txt = await r.text();
                        throw new Error(txt || 'Error al crear depósitos del motel');
                    }
                }

                // El motel ya se crea con propietarioId en el body — no hace falta un update adicional
            }
        }

        // PERSONAL (opcional, solo POST — no tiene sentido patchear usuarios del wizard)
        if (!isTarifaOnly && activeStep === personalStep) {
            const motelId = created.motelId || currentMotelId;
            const createdUserIds = [];
            for (const p of personal) {
                if (!p.username || !p.email || !p.password) continue;
                try {
                    // 1. Crear usuario y vincular a motel en un solo paso (NestJS)
                    const regRes = await fetch(getApiUrl('/usuarios'), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({
                            Username: p.username,
                            Email: p.email,
                            Password: p.password,
                            Rol: p.rol, // El backend normaliza a SUPERVISOR/RECEPCIONISTA
                            motelId: motelId
                        }),
                    });

                    if (!regRes.ok) {
                        const errData = await regRes.json();
                        const rawMsg = errData.message || (typeof errData === 'string' ? errData : '');
                        throw new Error(rawMsg || `Error al crear el usuario ${p.username}`);
                    }

                    const user = await regRes.json();
                    if (user?.id) createdUserIds.push(user.id);
                } catch (err) {
                    throw err; // propagar para mostrar en el modal
                }
            }
            // Guardar ids para que DevResetOnboarding pueda eliminarlos
            if (createdUserIds.length > 0) {
                setCreated(c => ({ ...c, personalUserIds: createdUserIds }));
            }
        }

        // TARIFA
        if (activeStep === tarifaStep) {
            const data = {
                Nombre: form.TarifaNombre,
                PrecioTurno: parseInt(form.PrecioTurno) || 0,
                PrecioDiario: parseInt(form.PrecioDiario) || 0,
                PrecioHrDiaExcede: parseInt(form.PrecioHrDiaExcede) || 0,
                PrecioHrNocheExcede: parseInt(form.PrecioHrDiaExcede) || 0,
                motelId: motelId,
            };
            if (created.tarifaId) {
                await dataProvider.update('tarifas', { id: created.tarifaId, data });
            } else {
                const { data: t } = await dataProvider.create('tarifas', { data });
                setCreated(c => ({ ...c, tarifaId: t.id }));
            }
        }

        // HABITACIONES (solo si no se crearon antes)
        if (activeStep === habitStep && !created.habitacionesCreadas) {
            const qty = Math.min(parseInt(form.HabitacionesCantidad), 50);
            const rooms = Array.from({ length: qty }, (_, i) => ({
                Identificador: `${form.HabitacionesPrefijo}${String(i + 1).padStart(2, '0')}`,
                Nombre: `Habitación ${form.HabitacionesPrefijo}${String(i + 1).padStart(2, '0')}`,
                Estado: 'DISPONIBLE',
                tarifaId: created.tarifaId,
                motelId: motelId,
            }));
            for (let i = 0; i < rooms.length; i += 10) {
                await Promise.all(rooms.slice(i, i + 10).map(data => dataProvider.create('habitaciones', { data })));
            }
            setCreated(c => ({ ...c, habitacionesCreadas: true }));
        }
    };

    const handleNext = async () => {
        const err = validate();
        if (err) { setStepError(err); return; }
        setStepError('');
        setSaving(true);
        try {
            await saveStep();
            if (activeStep === steps.length - 1) {
                await finishOnboarding();
            } else {
                setActiveStep(prev => prev + 1);
            }
        } catch (err) {
            setStepError(err.message || 'Ocurrió un error, intentá de nuevo');
        } finally {
            setSaving(false);
        }
    };

    const handleBack = () => {
        setStepError('');
        setActiveStep(prev => prev - 1);
    };

    const finishOnboarding = async () => {
        const token = Cookies.getCookie('token');
        const motelId = created.motelId || Cookies.getCookie('motel') || currentMotelId;
        console.log('[Onboarding] Finalizing onboarding for motel:', motelId);
        console.log('[Onboarding] importarCatalogo:', importarCatalogo);

        if (importarCatalogo && motelId) {
            try {
                console.log('[Onboarding] Fetching catalog products...');
                const catRes = await fetch(getApiUrl('/catalogo-productos?_page=1&_limit=1000&_sort=Nombre&_order=asc'), {
                    headers: { Authorization: `Bearer ${token}` },
                });
                
                if (!catRes.ok) {
                    console.error('[Onboarding] Failed to fetch catalog:', catRes.status, await catRes.text());
                    throw new Error('Failed to fetch catalog');
                }
                
                const catData = await catRes.json();
                console.log('[Onboarding] Catalog response:', catData);
                
                const itemsList = Array.isArray(catData) ? catData : (catData?.data || []);
                console.log('[Onboarding] Catalog items count:', itemsList.length);
                
                const allIds = itemsList.map(p => p.id).filter(id => !!id);
                console.log('[Onboarding] Catalog IDs to sync:', allIds);

                if (allIds.length > 0) {
                    console.log('[Onboarding] Syncing catalog products:', allIds.length);
                    const syncPayload = { motelId, catalogoIds: allIds };
                    console.log('[Onboarding] Sync payload:', syncPayload);
                    
                    const syncRes = await fetch(getApiUrl('/productos/sync-catalogo'), {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json', 
                            Authorization: `Bearer ${token}`,
                            'x-motel-id': motelId,
                        },
                        body: JSON.stringify(syncPayload),
                    });
                    
                    console.log('[Onboarding] Sync response status:', syncRes.status);
                    
                    if (!syncRes.ok) {
                        const errorMsg = await syncRes.text();
                        console.error('[Onboarding] Failed to sync catalog:', errorMsg);
                    } else {
                        const syncResult = await syncRes.json();
                        console.log('[Onboarding] Sync successful:', syncResult);
                    }
                } else {
                    console.warn('[Onboarding] No catalog IDs to sync');
                }
            } catch (err) { 
                console.error('[Onboarding] Error syncing products:', err); 
            }
        } else {
            console.log('[Onboarding] Skipping catalog sync - importarCatalogo:', importarCatalogo, 'motelId:', motelId);
        }


        await dataProvider.update('moteles', { id: motelId, data: { OnboardingCompleto: true } });
        setAvailableMoteles(prev =>
            prev.map(m => m.id === motelId ? { ...m, OnboardingCompleto: true } : m)
        );

        // Refrescar el token para obtener los moteles actualizados
        try {
            console.log('[Onboarding] Refreshing token...');
            const refreshRes = await fetch(getApiUrl('/autenticacion/refresh'), {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });

            if (refreshRes.ok) {
                const refreshData = await refreshRes.json();
                console.log('[Onboarding] Token refreshed successfully:', refreshData);
                
                // Actualizar el token en las cookies
                if (refreshData.token) {
                    Cookies.setCookie('token', refreshData.token, 1);
                }

                // Actualizar los moteles disponibles
                if (refreshData.usuario?.moteles) {
                    const motelesNormalizados = refreshData.usuario.moteles.map(m => ({
                        id: m.motelId || m.id,
                        nombre: m.nombre || m.Nombre,
                        OnboardingCompleto: m.OnboardingCompleto,
                    }));
                    setAvailableMoteles(motelesNormalizados);
                    localStorage.setItem('moteles', JSON.stringify(motelesNormalizados));
                }
            } else {
                console.error('[Onboarding] Failed to refresh token:', refreshRes.status);
            }
        } catch (err) {
            console.error('[Onboarding] Error refreshing token:', err);
        }

        notify('¡Motel listo para operar!', { type: 'success' });
        refresh();
        if (onFinish) onFinish();
    };

    const renderStep = (step) => {
        if (step === 0) return (
            <Box sx={{ py: 2, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={800} sx={{ color: '#1e1b4b', mb: 1 }}>
                    {isTarifaOnly ? '¡Nuevo Motel!' : '¡Bienvenido al Gestor de Moteles!'}
                </Typography>
                <Typography variant="body1" sx={{ color: '#64748b', mb: 3 }}>
                    {isTarifaOnly
                        ? 'Configurá tarifa, habitaciones y productos para tu nuevo motel.'
                        : 'Cada paso guarda automáticamente. Podés volver y corregir sin perder lo ya guardado.'}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3, bgcolor: '#f1f5f9', borderRadius: 4 }}>
                    <Rocket size={64} color="#4338ca" />
                </Box>
            </Box>
        );

        if (!isTarifaOnly && step === propietarioStep) return (
            <Box sx={{ py: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, color: '#1e1b4b' }}>Datos del Propietario</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <MuiTextField label="Nombre completo *" name="PropietarioNombre" value={form.PropietarioNombre}
                            onChange={handleChange} fullWidth
                            InputProps={{ startAdornment: <InputAdornment position="start"><User size={18} color="#94a3b8" /></InputAdornment> }} />
                    </Grid>
                    <Grid item xs={6}><MuiTextField label="Teléfono" name="PropietarioTelefono" value={form.PropietarioTelefono} onChange={handleChange} fullWidth /></Grid>
                    <Grid item xs={6}><MuiTextField label="CUIT" name="PropietarioCUIT" value={form.PropietarioCUIT} onChange={handleChange} fullWidth /></Grid>
                    <Grid item xs={6}><MuiTextField label="Ciudad" name="PropietarioCiudad" value={form.PropietarioCiudad} onChange={handleChange} fullWidth /></Grid>
                </Grid>
            </Box>
        );

        if (!isTarifaOnly && step === motelStep) return (
            <Box sx={{ py: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, color: '#1e1b4b' }}>Tu Motel</Typography>
                <MuiTextField label="Nombre del Motel *" name="MotelNombre" value={form.MotelNombre}
                    onChange={handleChange} fullWidth placeholder="Ej: Hotel Las Palmas"
                    InputProps={{ startAdornment: <InputAdornment position="start"><Building2 size={18} color="#94a3b8" /></InputAdornment> }} />
            </Box>
        );

        if (!isTarifaOnly && step === personalStep) return (
            <Box sx={{ py: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Users size={28} color="#4338ca" />
                    <Box>
                        <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#1e1b4b' }}>Personal del Motel</Typography>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>Opcional — dejá en blanco para saltear.</Typography>
                    </Box>
                </Box>
                {personal.map((p, i) => (
                    <Box key={i} sx={{ mb: 2, p: 2, borderRadius: 2, border: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                        <Typography variant="caption" fontWeight={700} sx={{ color: '#6366f1', mb: 1, display: 'block' }}>{p.rol}</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={4}>
                                <MuiTextField label="Usuario" value={p.username} fullWidth size="small"
                                    onChange={e => setPersonal(prev => prev.map((x, j) => j === i ? { ...x, username: e.target.value } : x))} />
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <MuiTextField label="Email" type="email" value={p.email} fullWidth size="small"
                                    onChange={e => setPersonal(prev => prev.map((x, j) => j === i ? { ...x, email: e.target.value } : x))} />
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <MuiTextField label="Contraseña" type="password" value={p.password} fullWidth size="small"
                                    onChange={e => setPersonal(prev => prev.map((x, j) => j === i ? { ...x, password: e.target.value } : x))} />
                            </Grid>
                        </Grid>
                    </Box>
                ))}
            </Box>
        );

        if (step === tarifaStep) return (
            <Box sx={{ py: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1, color: '#1e1b4b' }}>Tu primera Tarifa</Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
                    Podés personalizar desde <strong>Configuración → Moteles y Tarifas</strong>.
                </Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <MuiTextField label="Nombre de la Tarifa" name="TarifaNombre" value={form.TarifaNombre}
                            placeholder="Ej: Simple, Suite, VIP" onChange={handleChange} fullWidth variant="filled" />
                    </Grid>
                    <Grid item xs={6}><MuiTextField label="Precio Turno" name="PrecioTurno" value={form.PrecioTurno} type="number" onChange={handleChange} fullWidth /></Grid>
                    <Grid item xs={6}><MuiTextField label="Precio Diario" name="PrecioDiario" value={form.PrecioDiario} type="number" onChange={handleChange} fullWidth /></Grid>
                    <Grid item xs={6}><MuiTextField label="Precio Hora Excedente" name="PrecioHrDiaExcede" value={form.PrecioHrDiaExcede} type="number" onChange={handleChange} fullWidth /></Grid>
                    <Grid item xs={6}>
                        <MuiTextField label="Duración turno (hs)" name="MotelDuracionTurno" value={form.MotelDuracionTurno}
                            type="number" onChange={handleChange} fullWidth
                            inputProps={{ min: 1, max: 24 }} helperText="Horas por turno por defecto" />
                    </Grid>
                </Grid>
            </Box>
        );

        if (step === habitStep) return (
            <Box sx={{ py: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, color: '#1e1b4b' }}>Habitaciones</Typography>
                {created.habitacionesCreadas && (
                    <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                        Las habitaciones ya fueron creadas. Para modificarlas usá <strong>Configuración → Habitaciones</strong>.
                    </Alert>
                )}
                {!created.habitacionesCreadas && (
                    <Grid container spacing={3}>
                        <Grid item xs={6}>
                            <MuiTextField label="Cantidad" name="HabitacionesCantidad" value={form.HabitacionesCantidad}
                                type="number" onChange={handleChange} fullWidth helperText="Máximo 50" inputProps={{ min: 1, max: 50 }} />
                        </Grid>
                        <Grid item xs={6}>
                            <MuiTextField label="Prefijo" name="HabitacionesPrefijo" value={form.HabitacionesPrefijo}
                                onChange={handleChange} fullWidth helperText="Ej: A → A01, A02..." />
                        </Grid>
                        <Grid item xs={12}>
                            <Box sx={{ p: 2, bgcolor: '#eff6ff', borderRadius: 2, border: '1px dashed #3b82f6' }}>
                                <Typography variant="caption" sx={{ color: '#1e40af', fontWeight: 600 }}>
                                    Se crearán {form.HabitacionesCantidad} habitaciones: {form.HabitacionesPrefijo}01 → {form.HabitacionesPrefijo}{String(form.HabitacionesCantidad).padStart(2, '0')}
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                )}
            </Box>
        );

        if (step === productosStep) return (
            <Box sx={{ py: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#eef2ff' }}>
                        <Package size={28} color="#4338ca" />
                    </Box>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#1e1b4b' }}>¿Importar catálogo de productos?</Typography>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>Bebidas, amenities, snacks y más con un clic.</Typography>
                    </Box>
                </Box>
                <FormControlLabel
                    control={<Switch checked={importarCatalogo} onChange={e => setImportarCatalogo(e.target.checked)} color="primary" />}
                    label={<Typography variant="body1" fontWeight={700}>{importarCatalogo ? 'Sí, importar catálogo completo' : 'No, lo cargo manualmente después'}</Typography>}
                    sx={{ mb: 3, p: 2, borderRadius: 2, bgcolor: importarCatalogo ? '#eef2ff' : '#f8fafc', border: '1px solid', borderColor: importarCatalogo ? '#c7d2fe' : '#e2e8f0', width: '100%', mx: 0 }}
                />
                {importarCatalogo && (
                    <Box>
                        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, mb: 1, display: 'block' }}>Vista previa:</Typography>
                        {loadingCatalogo ? (
                            <Box display="flex" justifyContent="center" p={2}><CircularProgress size={24} /></Box>
                        ) : (
                            <Box sx={{ bgcolor: '#f8fafc', borderRadius: 2, p: 1.5, maxHeight: 160, overflowY: 'auto' }}>
                                {catalogoItems.map(p => (
                                    <Box key={p.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <CheckCircle2 size={14} color="#10b981" />
                                            <Typography variant="body2">{p.nombre}</Typography>
                                        </Box>
                                        <Chip label={p.rubro?.nombre || '—'} size="small" sx={{ fontSize: '0.7rem' }} />
                                    </Box>
                                ))}
                                {catalogoItems.length === 8 && (
                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>y más...</Typography>
                                )}
                            </Box>
                        )}
                    </Box>
                )}
            </Box>
        );

        return null;
    };

    const isLastStep = activeStep === steps.length - 1;

    return (
        <Box sx={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            zIndex: 9999, bgcolor: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2,
        }}>
            <Paper sx={{
                p: { xs: 3, md: 4 },
                width: '100%', maxWidth: 780,
                maxHeight: '90vh', overflowY: 'auto',
                borderRadius: 6, boxShadow: 24,
                display: 'flex', flexDirection: 'column',
            }}>
                <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
                    {steps.map(label => (
                        <Step key={label}>
                            <StepLabel sx={{ '& .MuiStepLabel-label': { fontSize: '0.72rem' } }}>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                <Box sx={{ flex: 1, minHeight: 280 }}>
                    {renderStep(activeStep)}
                </Box>

                {/* Error visible dentro del modal */}
                <Collapse in={!!stepError}>
                    <Alert
                        severity="error"
                        icon={<AlertCircle size={18} />}
                        sx={{ mt: 2, borderRadius: 2, fontWeight: 600 }}
                        onClose={() => setStepError('')}
                    >
                        {stepError}
                    </Alert>
                </Collapse>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                    <Button
                        color="inherit"
                        onClick={handleBack}
                        disabled={activeStep === 0 || saving}
                        sx={{ borderRadius: 2 }}
                    >
                        Atrás
                    </Button>
                    <Button
                        variant="contained" color="primary"
                        onClick={handleNext}
                        disabled={saving}
                        startIcon={saving ? <CircularProgress size={18} color="inherit" /> : isLastStep ? <Rocket size={18} /> : null}
                        sx={{ borderRadius: 3, px: 4, py: 1, fontWeight: 700 }}
                    >
                        {saving ? 'Guardando...' : isLastStep ? '¡Listo para operar!' : 'Siguiente'}
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
};

export default OnboardingWizard;
