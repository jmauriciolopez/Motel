import React from 'react';
import { Button, Box, Typography } from '@mui/material';
import { RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("[DEBUG ErrorBoundary] Caught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <Box 
                    display="flex" 
                    flexDirection="row" 
                    alignItems="center" 
                    justifyContent="center" 
                    height="80vh"
                    textAlign="center"
                    gap={2}
                    p={3}
                >
                    <Box
                        display="flex"
                        flexDirection="column"
                        alignItems="center"
                    >
                        <Typography variant="h5" color="error" gutterBottom>
                            Error al cargar el módulo
                        </Typography>
                        <Typography variant="body1" color="textSecondary" mb={3}>
                            Hubo un problema al descargar los archivos necesarios. Esto puede deberse a una conexión lenta o a una actualización del sistema.
                        </Typography>
                        <Button 
                            variant="contained" 
                            startIcon={<RefreshCw />}
                            onClick={() => window.location.reload()}
                        >
                            Recargar Aplicación
                        </Button>
                    </Box>
                </Box>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
