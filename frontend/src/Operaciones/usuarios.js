import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
    TableBody, Chip, Button, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, MenuItem, CircularProgress, IconButton, Tooltip,
    InputAdornment,
} from '@mui/material';
import { Title, useNotify } from 'react-admin';
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
            notify('Error al cargar usuarios', { type: 'error' });
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
            notify(`En modo trial el máximo es ${TRIAL_MAX_USERS} usuarios`, { type: 'warning' });
            return;
        }
        if (!form.Username || !form.Email || !form.Password || !form.motelId) {
            notify('Completá todos los campos', { type: 'warning' }); return;
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
            notify(`Usuario ${form.Username} creado`, { type: 'success' });
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
            notify('No podés eliminarte a vos mismo', { type: 'warning' });
            return;
        }
        if (!window.confirm('¿Eliminar este usuario?')) return;
        try {
            await http.delete(`/usuarios/${userId}`);
            notify('Usuario eliminado', { type: 'success' });
            setUsuarios(prev => prev.filter(u => u.id !== userId));
        } catch {
            notify('Error al eliminar', { type: 'error' });
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
            notify('La contraseña debe tener al menos 6 caracteres', { type: 'warning' });
            return;
        }
        setSaving(true);
        try {
            await http.patch(`/usuarios/${editTarget.id}`, { password: newPassword });
            notify('Contraseña actualizada', { type: 'success' });
            setOpenEdit(false);
        } catch (err) {
            notify('Error: ' + err.message, { type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box sx={{ mt: 2, maxWidth: 900, mx: 'auto' }}>
            <Title title="Gestión de Usuarios" />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h6" fontWeight={800} sx={{ color: '#1e1b4b' }}>
                        {isSuperAdmin ? 'Gestión Global de Usuarios' : 'Usuarios del Propietario'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {isSuperAdmin ? 'Administración completa de personal del sistema.' : 'Personal con acceso a tus moteles.'}
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
                                notify(`En modo trial el máximo es ${TRIAL_MAX_USERS} usuarios`, { type: 'warning' });
                                return;
                            }
                            setOpenCreate(true);
                        }}
                        disabled={isTrial && usuarios.length >= TRIAL_MAX_USERS}
                        sx={{ borderRadius: '10px', fontWeight: 700, textTransform: 'none' }}>
                        Nuevo Usuario {isTrial ? `(${usuarios.length}/${TRIAL_MAX_USERS})` : ''}
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
                                <TableCell sx={{ fontWeight: 700 }}>Usuario</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Rol</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Moteles</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="center">Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {usuarios.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                        No hay usuarios registrados
                                    </TableCell>
                                </TableRow>
                            )}
                            {usuarios.map(u => (
                                <TableRow key={u.id} hover sx={{ opacity: u.blocked ? 0.6 : 1 }}>
                                    <TableCell sx={{ fontWeight: 600 }}>{u.Username}</TableCell>
                                    <TableCell>{u.Email}</TableCell>
                                    <TableCell>
                                        <Chip label={u.Rol || '—'} size="small" color={ROL_COLOR[u.Rol] || 'default'} sx={{ fontWeight: 700 }} />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={u.deletedAt ? 'Inactivo' : 'Activo'}
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
                                            <Tooltip title={u.id === currentUserId ? 'Cambiar mi clave' : 'Cambiar clave'}>
                                                <IconButton size="small" color="primary" onClick={() => openEditDialog(u)}>
                                                    <PencilLine size={16} />
                                                </IconButton>
                                            </Tooltip>
                                            {u.id !== currentUserId && (
                                                <Tooltip title="Eliminar usuario">
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
                <DialogTitle sx={{ fontWeight: 800 }}>Nuevo Usuario</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                    <TextField label="Nombre de usuario *" value={form.Username}
                        onChange={e => setForm(f => ({ ...f, Username: e.target.value }))} fullWidth />
                    <TextField label="Email *" type="email" value={form.Email}
                        onChange={e => setForm(f => ({ ...f, Email: e.target.value }))} fullWidth />
                    <TextField label="Contraseña *" type="password" value={form.Password}
                        onChange={e => setForm(f => ({ ...f, Password: e.target.value }))} fullWidth />
                    <TextField label="Rol" select value={form.Rol}
                        onChange={e => setForm(f => ({ ...f, Rol: e.target.value }))} fullWidth>
                        {ROLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                    </TextField>
                    <TextField label="Motel *" select value={form.motelId}
                        onChange={e => setForm(f => ({ ...f, motelId: e.target.value }))} fullWidth>
                        {availableMoteles.map(m => (
                            <MenuItem key={m.id} value={m.id}>{m.nombre || m.Nombre}</MenuItem>
                        ))}
                    </TextField>
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button onClick={() => setOpenCreate(false)} color="inherit">Cancelar</Button>
                    <Button variant="contained" onClick={handleCreate} disabled={saving}
                        startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <UserPlus size={16} />}
                        sx={{ borderRadius: '10px', fontWeight: 700 }}>
                        {saving ? 'Creando...' : 'Crear Usuario'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="xs" fullWidth
                PaperProps={{ sx: { borderRadius: '16px' } }}>
                <DialogTitle sx={{ fontWeight: 800 }}>
                    {editTarget?.id === currentUserId ? 'Cambiar mi contraseña' : `Editar — ${editTarget?.Username}`}
                </DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                    <TextField
                        label="Nueva contraseña"
                        type={showPassword ? 'text' : 'password'}
                        value={editForm.newPassword}
                        onChange={e => setEditForm(f => ({ ...f, newPassword: e.target.value }))}
                        helperText="Mínimo 6 caracteres"
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
                    <Button onClick={() => setOpenEdit(false)} color="inherit">Cancelar</Button>
                    <Button variant="contained" onClick={handleEdit} disabled={saving}
                        startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <KeyRound size={16} />}
                        sx={{ borderRadius: '10px', fontWeight: 700 }}>
                        {saving ? 'Guardando...' : 'Guardar'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default GestorUsuarios;
