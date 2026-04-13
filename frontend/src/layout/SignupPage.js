import React, { useState } from 'react';
import { useNotify } from 'react-admin';
import { 
    Box, 
    Card, 
    CardContent, 
    TextField, 
    Button, 
    Typography, 
    IconButton, 
    InputAdornment,
    CircularProgress,
    Link
} from '@mui/material';
import { Eye, EyeOff, Lock, User, Mail, Rocket } from 'lucide-react';
import { motion } from 'framer-motion';
import authProvider from '../authProvider';

const SignupPage = () => {
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState({});
    
    const notify = useNotify();

    const validate = () => {
        const newErrors = {};
        
        if (!username || username.length < 3) {
            newErrors.username = 'El nombre de usuario debe tener al menos 3 caracteres';
        } else if (/\s/.test(username)) {
            newErrors.username = 'El nombre de usuario no puede contener espacios';
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            newErrors.email = 'El correo electrónico es obligatorio';
        } else if (!emailRegex.test(email)) {
            newErrors.email = 'El formato del correo no es válido';
        }
        
        if (!password || password.length < 6) {
            newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!validate()) {
            notify('Por favor, corrige los errores en el formulario', { type: 'warning' });
            return;
        }

        setLoading(true);
        authProvider.register({ username, email, password })
            .then(() => {
                setLoading(false);
                notify('¡Registro exitoso! Redirigiendo...', { type: 'success' });
                window.location.href = '/';
            })
            .catch((error) => {
                setLoading(false);
                const msg = error?.message || String(error);
                // Traducir mensajes comunes de Strapi
                if (msg.includes('already taken')) {
                    notify('El email o nombre de usuario ya está registrado. Intentá con otro.', { type: 'error' });
                } else if (msg.includes('password')) {
                    notify('La contraseña no cumple los requisitos mínimos.', { type: 'error' });
                } else {
                    notify(msg || 'Error en el registro', { type: 'error' });
                }
            });
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100vh',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                position: 'relative',
                overflow: 'hidden',
                py: 4
            }}
        >
            {/* Background Decorations */}
            <Box sx={{ position: 'absolute', top: -100, left: -100, width: 300, height: 300, borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', filter: 'blur(50px)' }} />
            <Box sx={{ position: 'absolute', bottom: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'rgba(236, 72, 153, 0.05)', filter: 'blur(70px)' }} />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
            >
                <Card sx={{ 
                    width: 450, 
                    borderRadius: '28px', 
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    p: 1
                }}>
                    <CardContent>
                        <Box sx={{ textAlign: 'center', mb: 4 }}>
                            <Box sx={{ 
                                display: 'inline-flex', 
                                p: 2, 
                                borderRadius: '20px', 
                                bgcolor: '#f5f3ff', 
                                color: '#7c3aed',
                                mb: 2 
                            }}>
                                <Rocket size={32} />
                            </Box>
                            <Typography variant="h4" sx={{ 
                                fontWeight: 800, 
                                fontFamily: "'Outfit', sans-serif",
                                color: '#0f172a',
                                mb: 1
                            }}>
                                Unirse a Gestor de Moteles
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                                Comienza tu prueba gratuita de 15 días hoy
                            </Typography>
                        </Box>

                        <form onSubmit={handleSubmit}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                <TextField
                                    label="Nombre de Usuario"
                                    variant="outlined"
                                    fullWidth
                                    autoFocus
                                    value={username}
                                    onChange={e => {
                                        setUsername(e.target.value);
                                        if (errors.username) setErrors({ ...errors, username: null });
                                    }}
                                    error={!!errors.username}
                                    helperText={errors.username}
                                    disabled={loading}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <User size={20} color="#94a3b8" />
                                            </InputAdornment>
                                        ),
                                        sx: { borderRadius: '14px' }
                                    }}
                                />
                                <TextField
                                    label="Correo Electrónico"
                                    type="email"
                                    variant="outlined"
                                    fullWidth
                                    value={email}
                                    onChange={e => {
                                        setEmail(e.target.value);
                                        if (errors.email) setErrors({ ...errors, email: null });
                                    }}
                                    error={!!errors.email}
                                    helperText={errors.email}
                                    disabled={loading}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Mail size={20} color="#94a3b8" />
                                            </InputAdornment>
                                        ),
                                        sx: { borderRadius: '14px' }
                                    }}
                                />
                                <TextField
                                    label="Contraseña"
                                    type={showPassword ? 'text' : 'password'}
                                    variant="outlined"
                                    fullWidth
                                    value={password}
                                    onChange={e => {
                                        setPassword(e.target.value);
                                        if (errors.password) setErrors({ ...errors, password: null });
                                    }}
                                    error={!!errors.password}
                                    helperText={errors.password}
                                    disabled={loading}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Lock size={20} color="#94a3b8" />
                                            </InputAdornment>
                                        ),
                                        // ... existing endAdornment logic ...
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    edge="end"
                                                >
                                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                        sx: { borderRadius: '14px' }
                                    }}
                                />
                                <Button
                                    type="submit"
                                    variant="contained"
                                    fullWidth
                                    disabled={loading}
                                    sx={{
                                        py: 1.8,
                                        borderRadius: '14px',
                                        bgcolor: '#7c3aed',
                                        '&:hover': { bgcolor: '#6d28d9' },
                                        fontWeight: 700,
                                        fontSize: '1rem',
                                        textTransform: 'none',
                                        boxShadow: '0 10px 15px -3px rgba(124, 58, 237, 0.3)',
                                        mt: 1
                                    }}
                                >
                                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Crear mi Cuenta'}
                                </Button>

                                <Box sx={{ textAlign: 'center', mt: 2 }}>
                                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                                        ¿Ya tienes una cuenta?{' '}
                                        <Link 
                                            href="#/login" 
                                            sx={{ 
                                                color: '#7c3aed', 
                                                fontWeight: 700, 
                                                textDecoration: 'none',
                                                '&:hover': { textDecoration: 'underline' }
                                            }}
                                        >
                                            Inicia Sesión
                                        </Link>
                                    </Typography>
                                </Box>
                            </Box>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </Box>
    );
};

export default SignupPage;
