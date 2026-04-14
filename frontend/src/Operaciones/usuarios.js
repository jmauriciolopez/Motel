import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
    TableBody, Chip, Button, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, MenuItem, CircularProgress, IconButton, Tooltip,
    InputAdornment,
} from '@mui/material';
import { Title, useNotify, useTranslate } from 'react-admin';
import { UserPlus, Trash2, RefreshCw, KeyRound, PencilLine, Eye, EyeOff } from 'lucide-react';
import { http } from '../shared/api/HttpClient';
import { useMotel } from '../context/MotelContext';
import { useTrial } from '../helpers/useTrial';

const ROLES = ['Administrador', 'Supervisor', 'Recepcionista'];

const ROL_COLOR = {
    Administrador: 'error',
    Supervisor: 'warning',
    Recepcionista: 'primary',
    SuperAdmin: 'secondary',
};

const GestorUsuarios = () => {
    const translate = useTranslate();
    const { availableMoteles, currentMotelId } = useMotel();
    const { isTrial } = useTrial();
    const TRIAL_MAX_USERS = 3;
    const notify = useNotify();
    const userRole = sessionStorage.getItem('role');
    const isSuperAdmin = userRole === 'SuperAdmin';

    const [currentUserId, setCurrentUserId] = useState(null);
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [openCreate, setOpenCreate] = useState(false);
    const [form, setForm] = useState({ Username: '', Email: '', Password: '', Rol: 'Recepcionista', motelId: '' });

    const [openEdit, setOpenEdit] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [editForm, setEditForm] = useState({ newPassword: '', blocked: false });
    const [showPassword, setShowPassword] = useState(false);

    const fetchUsuarios = async () => {
        setLoading(true);
        try {
            const motelIdActivo = currentMotelId || (availableMoteles.length > 0 ? availableMoteles[0].id : null);
            if (!motelIdActivo) { setUsuarios([]); return; }

            const result = await http.get(`/usuarios/por-motel`, { params: { motelId: motelIdActivo } });
            setUsuarios(Array.isArray(result) ? result : result.data || []);
        } catch {
            notify(translate('pos.users.load_error'), { type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        http.get('/usuarios/me')
            .then(data => setCurrentUserId(data?.id))
            .catch(() => {});
    }, []);

    useEffect(() => { fetchUsuarios(); }, [currentMotelId, availableMoteles.length]);

    const handleCreate = async () => {
        if (isTrial && usuarios.length >= TRIAL_MAX_USERS) {
            notify(translate('pos.users.trial_limit', { max: TRIAL_MAX_USERS }), { type: 'warning' });
            return;
        }
        if (!form.Username || !form.Email || !form.Password || !form.motelId) {
            notify(translate('pos.users.fill_all_fields'), { type: 'warning' }); return;
        }
        setSaving(true);
        try {
            await http.post('/autenticacion/registro', {
                Username: form.Username,
                Email: form.Email,
                Password: form.Password,
                Rol: form.Rol.toUpperCase(),
                motelId: form.motelId,
            });
            notify(translate('pos.users.user_created', { name: form.Username }), { type: 'success' });
            setOpenCreate(false);
            setForm({ Username: '', Email: '', Password: '', Rol: 'Recepcionista', motelId: '' });
            fetchUsuarios();
        } catch (err) {
            notify('Error: ' + err.message, { type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (userId) => {
        if (userId === currentUserId) {
            notify(translate('pos.users.cannot_delete_self'), { type: 'warning' });
            return;
        }
        if (!window.confirm(translate('pos.users.delete_confirm'))) return;
        try {
            await http.delete(`/usuarios/${userId}`);
            notify(translate('pos.users.user_deleted'), { type: 'success' });
            setUsuarios(prev => prev.filter(u => u.id !== userId));
        } catch {
            notify(translate('pos.users.delete_error'), { type: 'error' });
        }
    };

    const openEditDialog = (u) => {
        setEditTarget(u);
        setEditForm({ newPassword: '', blocked: u.blocked ?? false });
        setShowPassword(false);
        setOpenEdit(true);
    };

    const handleEdit = async () => {
        const { newPassword } = editForm;
        if (!newPassword || newPassword.length < 6) {
            notify(translate('pos.users.min_6_chars'), { type: 'warning' });
            return;
        }
        setSaving(true);
        try {
            await http.patch(`/usuarios/${editTarget.id}`, { password: newPassword });
            notify(translate('pos.users.password_updated'), { type: 'success' });
            setOpenEdit(false);
        } catch (err) {
            notify('Error: ' + err.message, { type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box sx={{ mt: 2, maxWidth: 900, mx: 'auto' }}>
            <Title title={translate('pos.users.title')} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h6" fontWeight={800} sx={{ color: '#1e1b4b' }}>
                        {isSuperAdmin ? translate('pos.users.global_management') : translate('pos.users.owner_management')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {isSuperAdmin ? translate('pos.users.global_subtitle') : translate('pos.users.owner_subtitle')}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Actualizar">
                        <IconButton onClick={fetchUsuarios} disabled={loading}>
                            <RefreshCw size={18} />
                        </IconButton>
                    </Tooltip>
                    <Button variant="contained" startIcon={<UserPlus size={18} />}
                        onClick={() => {
                            if (isTrial && usuarios.length >= TRIAL_MAX_USERS) {
                                notify(translate('pos.users.trial_limit', { max: TRIAL_MAX_USERS }), { type: 'warning' });
                                return;
                            }
                            setOpenCreate(true);
                        }}
                        disabled={isTrial && usuarios.length >= TRIAL_MAX_USERS}
                        sx={{ borderRadius: '10px', fontWeight: 700, textTransform: 'none' }}>
                        {translate('pos.users.new_user')} {isTrial ? `(${usuarios.length}/${TRIAL_MAX_USERS})` : ''}
                    </Button>
                </Box>
            </Box>

            {loading ? (
                <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>
            ) : (
                <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
                    <Table size="small">
                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>{translate('pos.users.username')}</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>{translate('pos.users.email')}</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>{translate('pos.users.role')}</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>{translate('pos.users.status')}</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>{translate('pos.users.motels')}</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="center">{translate('pos.users.actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {usuarios.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                        {translate('pos.users.no_users')}
                                    </TableCell>
                                </TableRow>
                            )}
                            {usuarios.map(u => (
                                <TableRow key={u.id} hover sx={{ opacity: u.blocked ? 0.6 : 1 }}>
                                    <TableCell sx={{ fontWeight: 600 }}>{u.Username}</TableCell>
                                    <TableCell>{u.Email}</TableCell>
                                    <TableCell>
                                        <Chip label={translate(`pos.users.roles.${u.Rol}`) || '—'} size="small" color={ROL_COLOR[u.Rol] || 'default'} sx={{ fontWeight: 700 }} />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={u.deletedAt ? translate('pos.users.inactive') : translate('pos.users.active')}
                                            size="small"
                                            color={u.deletedAt ? 'default' : 'success'}
                                            variant={u.deletedAt ? 'outlined' : 'filled'}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                            {u.moteles?.map(m => (
                                                <Chip key={m.motelId} label={m.motel?.Nombre || m.motelId} size="small" variant="outlined" />
                                            ))}
                                        </Box>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                            <Tooltip title={u.id === currentUserId ? translate('pos.users.change_my_password') : translate('pos.users.change_password')}>
                                                <IconButton size="small" color="primary" onClick={() => openEditDialog(u)}>
                                                    <PencilLine size={16} />
                                                </IconButton>
                                            </Tooltip>
                                            {u.id !== currentUserId && (
                                                <Tooltip title={translate('pos.users.delete_user')}>
                                                    <IconButton size="small" color="error" onClick={() => handleDelete(u.id)}>
                                                        <Trash2 size={16} />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Paper>
            )}

            <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth
                PaperProps={{ sx: { borderRadius: '16px' } }}>
                <DialogTitle sx={{ fontWeight: 800 }}>{translate('pos.users.new_user')}</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                    <TextField label={translate('pos.users.username_label')} value={form.Username}
                        onChange={e => setForm(f => ({ ...f, Username: e.target.value }))} fullWidth />
                    <TextField label={translate('pos.users.email_label')} type="email" value={form.Email}
                        onChange={e => setForm(f => ({ ...f, Email: e.target.value }))} fullWidth />
                    <TextField label={translate('pos.users.password_label')} type="password" value={form.Password}
                        onChange={e => setForm(f => ({ ...f, Password: e.target.value }))} fullWidth />
                    <TextField label={translate('pos.users.role')} select value={form.Rol}
                        onChange={e => setForm(f => ({ ...f, Rol: e.target.value }))} fullWidth>
                        {ROLES.map(r => <MenuItem key={r} value={r}>{translate(`pos.users.roles.${r}`)}</MenuItem>)}
                    </TextField>
                    <TextField label={translate('pos.users.motel_label')} select value={form.motelId}
                        onChange={e => setForm(f => ({ ...f, motelId: e.target.value }))} fullWidth>
                        {availableMoteles.map(m => (
                            <MenuItem key={m.id} value={m.id}>{m.nombre || m.Nombre}</MenuItem>
                        ))}
                    </TextField>
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button onClick={() => setOpenCreate(false)} color="inherit">{translate('ra.action.cancel')}</Button>
                    <Button variant="contained" onClick={handleCreate} disabled={saving}
                        startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <UserPlus size={16} />}
                        sx={{ borderRadius: '10px', fontWeight: 700 }}>
                        {saving ? translate('pos.users.creating') : translate('pos.users.create_user')}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="xs" fullWidth
                PaperProps={{ sx: { borderRadius: '16px' } }}>
                <DialogTitle sx={{ fontWeight: 800 }}>
                    {editTarget?.id === currentUserId ? translate('pos.users.change_my_password') : translate('pos.users.edit_user', { name: editTarget?.Username })}
                </DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                    <TextField
                        label={translate('pos.users.new_password')}
                        type={showPassword ? 'text' : 'password'}
                        value={editForm.newPassword}
                        onChange={e => setEditForm(f => ({ ...f, newPassword: e.target.value }))}
                        helperText={translate('pos.users.min_6_chars')}
                        fullWidth
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={() => setShowPassword(v => !v)} edge="end">
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button onClick={() => setOpenEdit(false)} color="inherit">{translate('ra.action.cancel')}</Button>
                    <Button variant="contained" onClick={handleEdit} disabled={saving}
                        startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <KeyRound size={16} />}
                        sx={{ borderRadius: '10px', fontWeight: 700 }}>
                        {saving ? translate('pos.users.saving') : translate('ra.action.save')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default GestorUsuarios;
