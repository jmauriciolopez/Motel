import React from 'react';
import { useMotel } from '../context/MotelContext';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Cookies } from '../helpers/Utils';

const TrialGuard = ({ children }) => {
    const { currentMotelId, availableMoteles } = useMotel();
    const role = Cookies.getCookie('role');
    const isSuperUser = role === 'SuperUser' || role === 'SuperAdmin';

    if (!currentMotelId || isSuperUser) {
        return children;
    }

    const currentMotel = availableMoteles.find(m => m.id === currentMotelId || m.id === currentMotelId);

    if (!currentMotel) {
        return children;
    }

    const { Trial_Expires_At, Is_Paid } = currentMotel;

    // Si ya está pagado, no hay restricción
    if (Is_Paid) {
        return children;
    }

    const now = new Date();
    const expiryDate = Trial_Expires_At ? new Date(Trial_Expires_At) : null;

    // Si no hay fecha de expiración (moteles viejos), le damos 30 días desde ahora
    if (!expiryDate) {
        return children; 
    }

    const isExpired = now > expiryDate;

    if (isExpired) {
        return (
            <Box 
                sx={{ 
                    height: '100vh', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    bgcolor: 'grey.100' 
                }}
            >
                <Paper sx={{ p: 4, maxWidth: 500, textAlign: 'center', borderRadius: 4 }}>
                    <Typography variant="h4" color="error" gutterBottom sx={{ fontWeight: 800 }}>
                        Periodo de Prueba Agotado
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 3 }}>
                        El periodo de prueba para <strong>{currentMotel.Nombre}</strong> ha finalizado. 
                        Para continuar utilizando el sistema, por favor contacta al administrador para activar tu suscripción.
                    </Typography>
                    <Button variant="contained" color="primary" size="large" onClick={() => window.location.reload()}>
                        Reintentar
                    </Button>
                </Paper>
            </Box>
        );
    }

    // Si el trial está activo, podrías mostrar un banner persistente aquí o simplemente dejar pasar
    return children;
};

export default TrialGuard;
