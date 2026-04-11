import React, { useState } from 'react';
import {
    Datagrid, List, TextField, DateField,
    DateTimeInput, useRecordContext, required, useDataProvider, useNotify, useCreate, TopToolbar, CreateButton, useListContext, useRefresh, FunctionField,
    SimpleForm, TextInput, ReferenceInput, AutocompleteInput, Create, NumberInput, useGetList, usePermissions
} from 'react-admin';
import { useMotel } from '../context/MotelContext';
import CustomToolbar from '../layout/CustomToolbar';
import {
    Grid, Button, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField as MuiTextField, InputAdornment, Box, Typography, Paper, Divider
} from '@mui/material';
import {
    PlusCircle as PlusIcon,
    MinusCircle as MinusIcon,
    Wallet as WalletIcon,
    History as HistoryIcon,
    Banknote as BalanceIcon,
    TrendingUp as IncomeIcon,
    FileText as NoteIcon
} from 'lucide-react';

const Requerido = [required()];

// -- Helper Components --
const SectionHeader = ({ icon: Icon, title }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 3, mb: 2 }}>
        <Icon size={18} color="#1976d2" />
        <Typography variant="subtitle1" fontWeight="700" color="primary">
            {title.toUpperCase()}
        </Typography>
    </Box>
);

const CajaBanner = () => {
    const { currentMotelId: motelId } = useMotel();
    const { data } = useGetList('cajas', {
        pagination: { page: 1, perPage: 1 },
        sort: { field: 'updatedAt', order: 'DESC' },
        filter: motelId ? { motelId: motelId } : {}
    });

    const lastSaldo = data && data.length > 0 ? data[0].Saldo : 0;

    return (
        <Paper elevation={0} sx={{
            p: 3,
            mb: 4,
            background: 'linear-gradient(45deg, #1a237e 30%, #3949ab 90%)',
            color: 'white',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <WalletIcon size={40} opacity={0.8} />
                <Box>
                    <Typography variant="overline" sx={{ fontWeight: 'bold', opacity: 0.9 }}>
                        Movimiento de Valores
                    </Typography>
                    <Typography variant="h5" fontWeight="900">
                        Ajuste Manual de Caja
                    </Typography>
                </Box>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" display="block" sx={{ opacity: 0.8 }}>Saldo en Sistema</Typography>
                <Typography variant="h4" fontWeight="900">
                    ${lastSaldo?.toLocaleString()}
                </Typography>
            </Box>
        </Paper>
    );
};

const BalanceCard = ({ lastSaldo }) => (
    <Paper elevation={0} sx={{
        p: 3,
        mb: 2,
        background: 'linear-gradient(45deg, #2c3e50 30%, #34495e 90%)',
        color: 'white',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
    }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <WalletIcon size={20} opacity={0.8} />
            <Typography variant="overline" sx={{ letterSpacing: 1.5, opacity: 0.8 }}>SALDO ACTUAL EN CAJA</Typography>
        </Box>
        <Typography variant="h3" fontWeight="900" sx={{ letterSpacing: -1 }}>
            ${lastSaldo?.toLocaleString()}
        </Typography>
    </Paper>
);

const validateCaja = (values) => {
    const errors = {};
    if (!values.Concepto) errors.Concepto = 'Completar Concepto';
    if (!values.Importe) errors.Importe = 'Completar Importe';
    return errors;
};

const AperturaDialog = ({ open, onClose, motelId, lastSaldo }) => {
    const [monto, setMonto] = useState('');
    const [create, { isLoading }] = useCreate();
    const notify = useNotify();
    const refresh = useRefresh();

    const handleConfirm = () => {
        if (!monto || isNaN(monto)) return;
        const totalInformado = parseFloat(monto);
        const importe = totalInformado - lastSaldo;
        create('cajas', { data: { Concepto: 'Apertura de Caja', Importe: importe, motelId: motelId } }, {
            onSuccess: () => {
                notify('Caja abierta correctamente', { type: 'success' });
                refresh(); onClose(); setMonto('');
            },
            onError: (error) => notify(`Error: ${error.message}`, { type: 'warning' })
        });
    };

    return (
        <Dialog open={open} onClose={onClose} PaperProps={{ sx: { borderRadius: '24px', p: 1, maxWidth: 400 } }}>
            <DialogTitle sx={{ fontWeight: 800, textAlign: 'center', pt: 3 }}>Apertura de Caja</DialogTitle>
            <DialogContent>
                <Paper variant="outlined" sx={{ mb: 3, p: 2, textAlign: 'center', borderRadius: '16px', borderStyle: 'dashed' }}>
                    <Typography variant="caption" color="text.secondary">Saldo Teórico</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900 }}>$ {lastSaldo?.toLocaleString()}</Typography>
                </Paper>
                <MuiTextField
                    autoFocus label="Monto Real en Caja" fullWidth variant="filled" type="number" value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                />
            </DialogContent>
            <DialogActions sx={{ p: 4, pt: 0 }}>
                <Button onClick={onClose} color="inherit">Cancelar</Button>
                <Button onClick={handleConfirm} variant="contained" color="success" disabled={isLoading} fullWidth sx={{ borderRadius: '12px', py: 1.5 }}>
                    Iniciar Jornada
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const CierreDialog = ({ open, onClose, motelId, lastSaldo }) => {
    const [montoQueda, setMontoQueda] = useState('');
    const [create, { isLoading }] = useCreate();
    const notify = useNotify();
    const refresh = useRefresh();

    const handleConfirm = () => {
        if (!montoQueda || isNaN(montoQueda)) return;
        const queda = parseFloat(montoQueda);
        const extraccion = queda - lastSaldo;
        create('cajas', { data: { Concepto: 'Cierre de Caja - extracción', Importe: extraccion, motelId: motelId } }, {
            onSuccess: () => {
                notify('Cierre de caja realizado', { type: 'success' });
                refresh(); onClose(); setMontoQueda('');
            },
            onError: (error) => notify(`Error: ${error.message}`, { type: 'warning' })
        });
    };

    return (
        <Dialog open={open} onClose={onClose} PaperProps={{ sx: { borderRadius: '24px', p: 1, maxWidth: 400 } }}>
            <DialogTitle sx={{ fontWeight: 800, textAlign: 'center', pt: 3 }}>Cierre de Caja</DialogTitle>
            <DialogContent>
                <Paper variant="outlined" sx={{ mb: 3, p: 2, textAlign: 'center', borderRadius: '16px', borderStyle: 'dashed', borderColor: 'primary.main' }}>
                    <Typography variant="caption" color="text.secondary">Saldo Disponible</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.main' }}>$ {lastSaldo?.toLocaleString()}</Typography>
                </Paper>
                <MuiTextField
                    autoFocus label="Monto que queda en Caja" fullWidth variant="filled" type="number" value={montoQueda}
                    onChange={(e) => setMontoQueda(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                />
            </DialogContent>
            <DialogActions sx={{ p: 4, pt: 0 }}>
                <Button onClick={onClose} color="inherit">Cancelar</Button>
                <Button onClick={handleConfirm} variant="contained" color="primary" disabled={isLoading} fullWidth sx={{ borderRadius: '12px', py: 1.5 }}>
                    Realizar Cierre
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const CajaActions = () => {
    const { permissions } = usePermissions();
    const isSupervisor = permissions === 'Supervisor' || permissions === 'Administrador' || permissions === 'SuperAdmin';
    const { currentMotelId } = useMotel();
    const { data } = useListContext();
    const [openApertura, setOpenApertura] = useState(false);
    const [openCierre, setOpenCierre] = useState(false);

    const lastSaldo = data && data.length > 0 ? data[0].Saldo : 0;

    if (!isSupervisor) return <TopToolbar />;

    return (
        <TopToolbar sx={{ gap: 1, mb: 1, alignItems: 'center' }}>
            <Button
                variant="contained" color="success" startIcon={<PlusIcon size={18} />}
                onClick={() => setOpenApertura(true)}
                sx={{ borderRadius: '12px', px: 3, py: 1, fontWeight: 700 }}
            >
                Abrir Caja
            </Button>
            <Button
                variant="contained" color="primary" startIcon={<MinusIcon size={18} />}
                onClick={() => setOpenCierre(true)}
                sx={{ borderRadius: '12px', px: 3, py: 1, fontWeight: 700 }}
            >
                Cerrar Caja
            </Button>
            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
            <CreateButton variant="outlined" label="Mov. Manual" sx={{ borderRadius: '12px' }} />

            <AperturaDialog open={openApertura} onClose={() => setOpenApertura(false)} motelId={currentMotelId} lastSaldo={lastSaldo} />
            <CierreDialog open={openCierre} onClose={() => setOpenCierre(false)} motelId={currentMotelId} lastSaldo={lastSaldo} />
        </TopToolbar>
    );
};

// Componente interno para consumir el contexto de la lista
const CajaListContent = () => {
    const { data, isLoading } = useListContext();
    const lastSaldo = data && data.length > 0 ? data[0].Saldo : 0;

    return (
        <Box sx={{ mt: 2 }}>
            <BalanceCard lastSaldo={lastSaldo} />
            <Datagrid bulkActionButtons={false} sx={{
                '& .RaDatagrid-rowCell': { padding: '16px 8px' },
                '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary', bgcolor: 'transparent' },
                borderRadius: '16px', border: '1px solid', borderColor: 'divider', overflow: 'hidden'
            }}>
                <DateField
                    source="updatedAt" showTime label="Fecha/Hora"
                    options={{ day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }}
                />
                <TextField source="Concepto" sx={{ fontWeight: 600 }} />
                <FunctionField
                    label="Importe"
                    render={record => (
                        <Typography sx={{ fontWeight: 700, color: record.Importe >= 0 ? 'success.main' : 'error.main' }}>
                            {record.Importe >= 0 ? '+' : ''}${record.Importe?.toLocaleString()}
                        </Typography>
                    )}
                />
                <FunctionField
                    label="Saldo"
                    render={record => (
                        <Typography sx={{ fontWeight: 800, color: 'text.primary' }}>
                            ${record.Saldo?.toLocaleString()}
                        </Typography>
                    )}
                />
            </Datagrid>
        </Box>
    );
};

const CajaList = () => {
    return (
        <List
            sort={{ field: 'updatedAt', order: 'DESC' }}
            actions={<CajaActions />}
            sx={{ '& .RaList-main': { boxShadow: 'none' } }}
        >
            <CajaListContent />
        </List>
    );
};

export const CajaCreate = () => {
    return (
        <Create redirect="list" sx={{ mt: 2 }}>
            <SimpleForm
                toolbar={<CustomToolbar backTo="/cajas" />}
                validate={validateCaja}
                defaultValues={{ createdAt: new Date() }}
            >
                <CajaBanner />
                <SectionHeader icon={IncomeIcon} title="Detalles del Movimiento" />
                <Paper elevation={0} sx={{ p: 4, backgroundColor: 'action.hover', borderRadius: 4, mb: 3 }}>
                    <Grid container spacing={4}>
                        <Grid item xs={12} md={6}>
                            <DateTimeInput source="createdAt" label="Fecha y Hora del Movimiento" validate={required()} fullWidth />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <NumberInput
                                source="Importe"
                                label="Importe (Negativo para gastos)"
                                fullWidth
                                validate={required()}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                    sx: { fontWeight: 800, fontSize: '1.2rem' }
                                }}
                            />
                            <Box sx={{ mt: 2 }}>
                                <TextInput
                                    source="Concepto"
                                    label="Motivo o Justificación"
                                    fullWidth
                                    multiline
                                    rows={8}
                                    validate={required()}
                                    helperText="Describa el motivo de este ingreso o egreso."
                                />
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>
            </SimpleForm>
        </Create>
    );
};

const cajasResource = {
    list: CajaList,
    create: CajaCreate,
};
export default cajasResource;
