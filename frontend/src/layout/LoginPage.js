import React, { useState } from 'react';
import { useLogin, useNotify } from 'react-admin';
import {
    Box, TextField, Button, Typography,
    IconButton, InputAdornment, CircularProgress, Link,
} from '@mui/material';
import { Eye, EyeOff, Lock, User, KeyRound, Building2 } from 'lucide-react';

const IS_LOCAL = window.location.hostname === 'localhost';

// Partícula decorativa flotante
const Orb = ({ sx }) => (
    <Box sx={{
        position: 'absolute',
        borderRadius: '50%',
        filter: 'blur(60px)',
        pointerEvents: 'none',
        ...sx,
    }} />
);

const LoginPage = () => {
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const login = useLogin();
    const notify = useNotify();

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        login({ username, password }).catch(() => {
            setLoading(false);
            notify('Credenciales inválidas', { type: 'error' });
        });
    };

    // Shortcut oculto — solo en localhost, click en el logo
    const handleShortcut = () => {
        if (!IS_LOCAL) return;
        setUsername('superadmin');
        setPassword('admin123');
    };

    const inputSx = {
        '& .MuiOutlinedInput-root': {
            borderRadius: '14px',
            bgcolor: 'rgba(255,255,255,0.06)',
            color: '#f1f5f9',
            '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
            '&:hover fieldset': { borderColor: 'rgba(99,102,241,0.5)' },
            '&.Mui-focused fieldset': { borderColor: '#6366f1' },
        },
        '& .MuiInputLabel-root': { color: '#94a3b8' },
        '& .MuiInputLabel-root.Mui-focused': { color: '#818cf8' },
        '& input': { color: '#f1f5f9' },
    };

    return (
        <Box sx={{
            minHeight: '100vh',
            display: 'flex',
            background: 'linear-gradient(135deg, #0f0e1a 0%, #1a1040 50%, #0f172a 100%)',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Orbs de fondo */}
            <Orb sx={{ width: 500, height: 500, top: -150, left: -150, background: 'rgba(99,102,241,0.15)' }} />
            <Orb sx={{ width: 400, height: 400, bottom: -100, right: -100, background: 'rgba(236,72,153,0.08)' }} />
            <Orb sx={{ width: 300, height: 300, top: '40%', left: '30%', background: 'rgba(139,92,246,0.07)' }} />

            {/* Panel izquierdo — branding */}
            <Box sx={{
                display: { xs: 'none', md: 'flex' },
                flex: 1,
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'flex-start',
                px: 8,
                position: 'relative',
                zIndex: 1,
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 6 }}>
                    <Box sx={{
                        p: 1.5, borderRadius: '16px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
                    }}>
                        <Building2 size={28} color="white" />
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#f1f5f9', fontFamily: "'Outfit', sans-serif" }}>
                        Gestor de Moteles
                    </Typography>
                </Box>

                <Typography variant="h2" sx={{
                    fontWeight: 900,
                    fontFamily: "'Outfit', sans-serif",
                    color: '#f1f5f9',
                    lineHeight: 1.1,
                    mb: 3,
                    maxWidth: 480,
                }}>
                    Gestión inteligente para tu motel
                </Typography>

                <Typography variant="body1" sx={{ color: '#94a3b8', maxWidth: 400, lineHeight: 1.8 }}>
                    Control total de turnos, stock, finanzas y operaciones desde un solo lugar.
                </Typography>

                {/* Feature pills */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 5 }}>
                    {['Turnos en tiempo real', 'Multi-motel', 'Reportes', 'Stock inteligente','Paneles de Control','Rendimientos'].map(f => (
                        <Box key={f} sx={{
                            px: 2, py: 0.8,
                            borderRadius: '20px',
                            border: '1px solid rgba(99,102,241,0.3)',
                            bgcolor: 'rgba(99,102,241,0.1)',
                            color: '#a5b4fc',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                        }}>
                            {f}
                        </Box>
                    ))}
                </Box>
            </Box>

            {/* Panel derecho — formulario */}
            <Box sx={{
                width: { xs: '100%', md: 480 },
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                px: { xs: 3, md: 6 },
                position: 'relative',
                zIndex: 1,
                borderLeft: { md: '1px solid rgba(255,255,255,0.06)' },
                backdropFilter: 'blur(20px)',
                bgcolor: 'rgba(15,14,26,0.6)',
            }}>
                <Box sx={{ width: '100%', maxWidth: 380 }}>
                    {/* Logo — shortcut oculto en localhost */}
                    <Box
                        onClick={handleShortcut}
                        sx={{
                            display: 'flex', alignItems: 'center', gap: 2, mb: 6,
                            cursor: IS_LOCAL ? 'pointer' : 'default',
                            userSelect: 'none',
                        }}
                    >
                        <Box sx={{
                            p: 1.5, borderRadius: '14px',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            boxShadow: IS_LOCAL ? '0 0 0 0 rgba(99,102,241,0.4)' : 'none',
                            transition: 'box-shadow 0.2s',
                            '&:hover': IS_LOCAL ? { boxShadow: '0 0 0 6px rgba(99,102,241,0.15)' } : {},
                        }}>
                            <KeyRound size={22} color="white" />
                        </Box>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#f1f5f9', lineHeight: 1, fontFamily: "'Outfit', sans-serif" }}>
                                Gestor de Moteles
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                                Sistema de gestión
                            </Typography>
                        </Box>
                    </Box>

                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#f1f5f9', mb: 1, fontFamily: "'Outfit', sans-serif" }}>
                        Bienvenido de vuelta
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748b', mb: 4 }}>
                        Ingresá tus credenciales para acceder al sistema
                    </Typography>

                    <form onSubmit={handleSubmit}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                            <TextField
                                label="Usuario o Email"
                                variant="outlined"
                                fullWidth
                                autoFocus
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                disabled={loading}
                                sx={inputSx}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <User size={18} color="#64748b" />
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            <TextField
                                label="Contraseña"
                                type={showPassword ? 'text' : 'password'}
                                variant="outlined"
                                fullWidth
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                disabled={loading}
                                sx={inputSx}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Lock size={18} color="#64748b" />
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: '#64748b' }}>
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            <Button
                                type="submit"
                                variant="contained"
                                fullWidth
                                disabled={loading}
                                sx={{
                                    mt: 1, py: 1.6,
                                    borderRadius: '14px',
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                        boxShadow: '0 8px 25px rgba(99,102,241,0.4)',
                                    },
                                    fontWeight: 700,
                                    fontSize: '1rem',
                                    textTransform: 'none',
                                    boxShadow: '0 4px 15px rgba(99,102,241,0.25)',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {loading
                                    ? <CircularProgress size={22} color="inherit" />
                                    : 'Iniciar Sesión'
                                }
                            </Button>

                            <Box sx={{ textAlign: 'center', mt: 1 }}>
                                <Typography variant="body2" sx={{ color: '#475569' }}>
                                    ¿No tenés cuenta?{' '}
                                    <Link href="#/signup" sx={{
                                        color: '#818cf8', fontWeight: 700,
                                        textDecoration: 'none',
                                        '&:hover': { color: '#a5b4fc' },
                                    }}>
                                        Registrate
                                    </Link>
                                </Typography>
                            </Box>
                        </Box>
                    </form>
                </Box>

                <Typography variant="caption" sx={{ mt: 8, color: 'rgba(255,255,255,0.15)', fontWeight: 500 }}>
                    © 2026 Gestor de Moteles· v2.0
                </Typography>
            </Box>
        </Box>
    );
};

export default LoginPage;
