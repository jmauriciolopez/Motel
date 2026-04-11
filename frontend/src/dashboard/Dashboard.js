import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import { Activity, BarChart2 } from 'lucide-react';
import { usePermissions } from 'react-admin';
import AdminDashboard from './AdminDashboard';
import OperatorDashboard from './OperatorDashboard';
import { motion, AnimatePresence } from 'framer-motion';
import { useMotel } from '../context/MotelContext';

const Dashboard = () => {
    const { permissions } = usePermissions();
    const { currentMotelId, availableMoteles } = useMotel();
    const [viewMode, setViewMode] = useState('operational');

    const isAdmin = permissions === 'Administrador';
    const isSupervisor = isAdmin || permissions === 'Supervisor';
    const isRecepcionista = permissions === 'Recepcionista';

    const currentMotel = availableMoteles?.find(m => m.id === currentMotelId);
    const onboardingCompleto = currentMotel?.OnboardingCompleto === true;

    useEffect(() => {
        if (isSupervisor) {
            setViewMode('strategic');
        } else {
            setViewMode('operational');
        }
    }, [permissions, isSupervisor]);

    const handleToggle = (mode) => {
        if (isRecepcionista && mode === 'strategic') return;
        setViewMode(mode);
    };

    if (!currentMotelId || !onboardingCompleto) return null;

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc' }}>
            {/* Toggle Header - Only for Supervisor/Admin */}
            {isSupervisor && (
                <Box sx={{
                    px: 4,
                    pt: 4,
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center'
                }}>
                    <Paper elevation={0} sx={{
                        p: 0.5,
                        borderRadius: '16px',
                        bgcolor: '#e2e8f0',
                        display: 'flex',
                        gap: 0.5
                    }}>
                        <Button
                            size="small"
                            startIcon={<Activity size={16} />}
                            onClick={() => handleToggle('operational')}
                            sx={{
                                borderRadius: '12px',
                                px: 3,
                                py: 1,
                                fontWeight: 700,
                                textTransform: 'none',
                                bgcolor: viewMode === 'operational' ? 'white' : 'transparent',
                                color: viewMode === 'operational' ? '#6366f1' : '#64748b',
                                boxShadow: viewMode === 'operational' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                                '&:hover': { bgcolor: viewMode === 'operational' ? 'white' : '#cbd5e1' }
                            }}
                        >
                            Vista Operativa
                        </Button>
                        <Button
                            size="small"
                            startIcon={<BarChart2 size={16} />}
                            onClick={() => handleToggle('strategic')}
                            sx={{
                                borderRadius: '12px',
                                px: 3,
                                py: 1,
                                fontWeight: 700,
                                textTransform: 'none',
                                bgcolor: viewMode === 'strategic' ? 'white' : 'transparent',
                                color: viewMode === 'strategic' ? '#6366f1' : '#64748b',
                                boxShadow: viewMode === 'strategic' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                                '&:hover': { bgcolor: viewMode === 'strategic' ? 'white' : '#cbd5e1' }
                            }}
                        >
                            Vista Estratégica
                        </Button>
                    </Paper>
                </Box>
            )}

            {/* Content with Animation */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={viewMode}
                    initial={{ opacity: 0, x: viewMode === 'strategic' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: viewMode === 'strategic' ? -20 : 20 }}
                    transition={{ duration: 0.3 }}
                >
                    {viewMode === 'strategic' ? <AdminDashboard /> : <OperatorDashboard />}
                </motion.div>
            </AnimatePresence>
        </Box>
    );
};

export default Dashboard;
