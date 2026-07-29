import React, { useEffect } from 'react';
import {
    AutocompleteInput, Create, Datagrid, DateField, DateTimeInput, Edit, EditButton, List, NumberField, NumberInput, ReferenceInput, required, SimpleForm, TextField, TextInput, useDataProvider, useNotify, useRecordContext, useGetList,
    TopToolbar, CreateButton, usePermissions, FunctionField
} from 'react-admin';
import { useDeletedRowSx } from '../helpers/deletedRowSx';
import { useMotel } from '../context/MotelContext';
import { useFormContext } from 'react-hook-form';
import { Grid, Box, Typography, Paper, InputAdornment, Chip } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import {
    Payments as PaymentsIcon,
    Receipt as ReceiptIcon,
    AccountBalanceWallet as WalletIcon,
    MeetingRoom as RoomIcon,
    Event as EventIcon,
    CheckCircle as CheckIcon,
    AttachMoney as MoneyIcon
} from '@mui/icons-material';
import CustomToolbar from '../layout/CustomToolbar';

const Requerido = [required()];

// -- Helper Components --
const SectionHeader = ({ icon: Icon, title }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 3, mb: 2 }}>
        <Icon color="primary" sx={{ fontSize: 20 }} />
        <Typography variant="subtitle1" fontWeight="700" color="primary">
            {title.toUpperCase()}
        </Typography>
    </Box>
);

const PagoStatusBanner = () => {
    const record = useRecordContext();
    if (!record) return null;

    return (
        <Paper elevation={0} sx={{
            p: 3,
            mb: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(45deg, #2e7d32 30%, #4caf50 90%)',
            color: 'white',
            borderRadius: '16px'
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CheckIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                <Box>
                    <Typography variant="overline" sx={{ fontWeight: 'bold', opacity: 0.9 }}>
                        Comprobante de Pago
                    </Typography>
                    <Typography variant="h5" fontWeight="900">
                        Habitación {record.turno?.habitacion?.Identificador || '---'}
                    </Typography>
                </Box>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" display="block" sx={{ opacity: 0.8 }}>Monto Total</Typography>
                <Typography variant="h4" fontWeight="900">
                    ${record.Importe?.toLocaleString()}
                </Typography>
            </Box>
        </Paper>
    );
};

const DefaultValueSetter = ({ source, value }) => {
    const { setValue, getValues } = useFormContext();
    useEffect(() => {
        if (value && !getValues(source)) {
            setValue(source, value);
        }
    }, [value, source, setValue, getValues]);
    return null;
};

const inputText = choice => choice?.habitacion?.Identificador || '';

const Filtros = [
    <TextInput label="Buscar Referencia" source="q" alwaysOn />,
];

const PagoListActions = () => {
    const { permissions } = usePermissions();
    const canCreate = permissions === 'Supervisor' || permissions === 'Administrador' || permissions === 'SuperAdmin';
    return (
        <TopToolbar>
            {canCreate && <CreateButton />}
        </TopToolbar>
    );
};

const PagoList = () => {
    const { currentMotelId: motelId } = useMotel();
    const filter = motelId ? { motelId: motelId } : {};
    const deletedRowSx = useDeletedRowSx();

    return (
        <Box sx={{ mt: 2 }}>
            <List actions={<PagoListActions />} filters={Filtros} sort={{ field: 'createdAt', order: 'DESC' }} filter={filter}>
                <Datagrid bulkActionButtons={false} rowClick="edit" rowSx={deletedRowSx} sx={{
                    '& .RaDatagrid-rowCell': { padding: '16px 8px' },
                    '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary' },
                    borderRadius: '16px', border: '1px solid', borderColor: 'divider', overflow: 'hidden'
                }}>
                    <DateField label="Fecha" source="createdAt" showTime
                        options={{ year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }}
                    />
                    <TextField label="Habitación" source="turno.habitacion.Identificador" sx={{ fontWeight: 600, color: 'primary.main' }} />
                    <TextField label="Patente" source="turno.cliente.Patente" />
                    <FunctionField
                        label="Forma de Pago"
                        render={record => (
                            <Chip
                                label={record.formaPago?.Tipo || '---'}
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ fontWeight: 600 }}
                            />
                        )}
                    />
                    <TextField source="Referencia" label="Referencia" />
                    <NumberField source="Importe" options={{ style: 'currency', currency: 'ARS' }} sx={{ fontWeight: 700, color: 'success.main' }} />
                </Datagrid>
            </List>
        </Box>
    );
};

export const PagoEdit = () => (
    <Edit mutationMode="pessimistic">
        <SimpleForm toolbar={<CustomToolbar backTo="/pagos" />}>
            <PagoStatusBanner />
            <SectionHeader icon={ReceiptIcon} title="Detalles de la Transacción" />
            <Paper elevation={0} sx={{ p: 4, backgroundColor: 'action.hover', borderRadius: 4, mb: 3 }}>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <DateTimeInput source="createdAt" label="Fecha de Pago" fullWidth disabled />
                        <Box sx={{ mt: 2 }}>
                            <TextInput source="Referencia" label="Número de Referencia" fullWidth
                                InputProps={{
                                    startAdornment: <InputAdornment position="start"><ReceiptIcon color="action" /></InputAdornment>
                                }}
                            />
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <NumberInput source="Importe" label="Importe Pagado" fullWidth disabled
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><MoneyIcon color="action" /></InputAdornment>,
                                sx: { fontWeight: 700, fontSize: '1.2rem' }
                            }}
                        />
                        <Box sx={{ mt: 2 }}>
                            <TextInput source="formaPago.Tipo" label="Método de Pago" fullWidth disabled />
                        </Box>
                    </Grid>
                </Grid>
            </Paper>
        </SimpleForm>
    </Edit>
);

const PagoCreate = () => {
    const { data: formasPago, isLoading } = useGetList('formapagos', {
        pagination: { page: 1, perPage: 100 }
    });

    const recordEfectivo = formasPago?.find(f =>
        f.Tipo?.toLowerCase().includes('efectivo') ||
        f.Tipo?.toLowerCase() === 'efectivo'
    );
    const defaultFormaPago = recordEfectivo?.id;

    const { currentMotelId } = useMotel();

    const transform = data => ({
        ...data,
        motelId: currentMotelId,
        turnoId: typeof data.turnoId === 'object' ? data.turnoId?.id : data.turnoId,
        formaPagoId: typeof data.formaPagoId === 'object' ? data.formaPagoId?.id : data.formaPagoId,
    });

    const location = useLocation();
    const initialRecord = location.state?.record || {};
    const initialTurnoId = initialRecord.turnoId;
    const turnoData = initialRecord.turno || null;

    // SaldoPendiente puede llegar como number, string o Decimal — normalizar siempre
    const saldoRaw = turnoData?.SaldoPendiente ?? turnoData?.Total ?? initialRecord.Importe ?? 0;
    const saldo = Math.max(0, Number(saldoRaw) || 0);
    const totalTurno = Number(turnoData?.Total ?? 0);
    const totalPagado = Math.max(0, totalTurno - saldo);

    const validateCreation = (values) => {
        const errors = {};
        if (!values.formaPagoId) errors.formaPagoId = 'Por favor, seleccione un método de pago';
        if (!values.turnoId)     errors.turnoId     = 'Debe seleccionar un turno/habitación';
        if (!values.Importe || Number(values.Importe) <= 0) errors.Importe = 'Debe ingresar el importe a cobrar';
        // Solo validar límite de saldo si tenemos saldo confiable del turno
        if (saldo > 0 && Number(values.Importe) > saldo + 0.01) {
            errors.Importe = `No puede superar el saldo pendiente ($${saldo.toFixed(2)})`;
        }
        return errors;
    };

    return (
        <Create redirect="/turnos" transform={transform} sx={{ mt: 2 }}>
            <SimpleForm
                validate={validateCreation}
                defaultValues={{
                    Importe: saldo || undefined,
                    turnoId: initialTurnoId,
                    formaPagoId: defaultFormaPago
                }}
                toolbar={<CustomToolbar backTo="/turnos" />}
            >
                <SectionHeader icon={PaymentsIcon} title="Nuevo Comprobante de Pago" />

                {/* Desglose financiero del turno */}
                {turnoData && (
                    <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                        <Grid container spacing={1} alignItems="center">
                            <Grid item xs={4} sx={{ textAlign: 'center' }}>
                                <Typography variant="caption" color="text.secondary" display="block">Total del turno</Typography>
                                <Typography variant="h6" fontWeight={800} color="text.primary">
                                    ${totalTurno.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </Typography>
                            </Grid>
                            <Grid item xs={4} sx={{ textAlign: 'center' }}>
                                <Typography variant="caption" color="text.secondary" display="block">Ya pagado</Typography>
                                <Typography variant="h6" fontWeight={800} color="success.main">
                                    ${totalPagado > 0 ? totalPagado.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                                </Typography>
                            </Grid>
                            <Grid item xs={4} sx={{ textAlign: 'center' }}>
                                <Typography variant="caption" color="text.secondary" display="block">Saldo pendiente</Typography>
                                <Typography variant="h6" fontWeight={800} color={saldo > 0 ? 'warning.main' : 'success.main'}>
                                    ${saldo.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </Typography>
                            </Grid>
                        </Grid>
                    </Paper>
                )}

                <Paper elevation={0} sx={{ p: 4, backgroundColor: 'action.hover', borderRadius: 4, mb: 3 }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <ReferenceInput source="turnoId" reference="turnos" perPage={300}>
                                <AutocompleteInput
                                    label='Habitación / Turno'
                                    validate={Requerido}
                                    inputText={inputText}
                                    readOnly={true}
                                    fullWidth
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start"><RoomIcon color="action" /></InputAdornment>
                                    }}
                                />
                            </ReferenceInput>
                            <Box sx={{ mt: 2 }}>
                                <TextInput
                                    source="Referencia"
                                    label="Referencia (Opcional)"
                                    placeholder="Ej: Nro de comprobante, ticket..."
                                    fullWidth
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start"><ReceiptIcon color="action" /></InputAdornment>
                                    }}
                                />
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <ReferenceInput source="formaPagoId" reference="formapagos">
                                <AutocompleteInput
                                    label='Método de Pago'
                                    optionText='Tipo'
                                    fullWidth
                                    validate={Requerido}
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start"><WalletIcon color="action" /></InputAdornment>
                                    }}
                                />
                            </ReferenceInput>
                            <Box sx={{ mt: 2 }}>
                                <NumberInput
                                    label={saldo > 0 ? `Importe a Cobrar (máx. $${saldo.toFixed(2)})` : 'Importe a Cobrar'}
                                    source='Importe'
                                    fullWidth
                                    validate={Requerido}
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start"><MoneyIcon color="action" /></InputAdornment>,
                                        sx: { fontWeight: 800, fontSize: '1.4rem', color: 'success.main' }
                                    }}
                                />
                                {saldo > 0 && (
                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                        Podés ingresar un importe parcial ≤ ${saldo.toFixed(2)}
                                    </Typography>
                                )}
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>
            </SimpleForm>
        </Create>
    );
};

const resourcePago = {
    list: PagoList,
    edit: PagoEdit,
    create: PagoCreate,
    icon: PaymentsIcon,
};

export default resourcePago;
