import React from 'react';
import {
    Datagrid, List, TextField, Edit, EditButton, NumberInput, AutocompleteInput, SimpleForm, TextInput, ReferenceInput, Create, DateField,
    DateTimeInput, required, useRecordContext, FunctionField, TopToolbar, CreateButton, usePermissions
} from 'react-admin';
import { useMotel } from '../context/MotelContext';
import { Grid, Box, Typography, Paper, InputAdornment } from '@mui/material';
import {
    MoneyOff as ExpenseIcon,
    Note as NoteIcon
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

const GastoStatusBanner = () => {
    const record = useRecordContext();
    if (!record) return null;

    return (
        <Paper elevation={0} sx={{
            p: 3,
            mb: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(45deg, #f44336 30%, #ff5722 90%)',
            color: 'white',
            borderRadius: '16px'
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <ExpenseIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                <Box>
                    <Typography variant="overline" sx={{ fontWeight: 'bold', opacity: 0.9 }}>
                        Registro de Gasto Externo
                    </Typography>
                    <Typography variant="h5" fontWeight="900">
                        {record.Concepto}
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

const validateGasto = (values) => {
    const errors = {};
    if (!values.Concepto) errors.Concepto = 'Completar Concepto';
    if (!values.Importe) errors.Importe = 'Completar Importe';
    return errors;
};

const GastoListActions = () => {
    const { permissions } = usePermissions();
    const isSupervisor = permissions === 'Supervisor' || permissions === 'Administrador' || permissions === 'SuperAdmin';
    return (
        <TopToolbar>
            {isSupervisor && <CreateButton />}
        </TopToolbar>
    );
};

const GastoList = () => {
    const { currentMotelId: motelId } = useMotel();
    const filter = motelId ? { motelId: motelId } : {};

    return (
        <Box sx={{ mt: 2 }}>
            <List actions={<GastoListActions />} sort={{ field: 'updatedAt', order: 'DESC' }} filter={filter}>
                <Datagrid bulkActionButtons={false} sx={{
                    '& .RaDatagrid-rowCell': { padding: '16px 8px' },
                    '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary' },
                    borderRadius: '16px', border: '1px solid', borderColor: 'divider', overflow: 'hidden'
                }}>
                    <DateField
                        source="updatedAt" showTime label="Fecha/Hora"
                        options={{ day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }}
                    />
                    <TextField source="Concepto" sx={{ fontWeight: 600, color: 'text.primary' }} />
                    <TextField label="Motel" source="motel.Nombre" />
                    <FunctionField
                        label="Importe"
                        render={record => (
                            <Typography sx={{ fontWeight: 800, color: 'error.main' }}>
                                -${record.Importe?.toLocaleString()}
                            </Typography>
                        )}
                    />
                    <EditButton />
                </Datagrid>
            </List>
        </Box>
    );
};

export const GastoEdit = () => {
    return (
        <Edit mutationMode="pessimistic">
            <SimpleForm toolbar={<CustomToolbar backTo="/gastos" />}>
                <GastoStatusBanner />
                <SectionHeader icon={NoteIcon} title="Detalles del Gasto" />
                <Paper elevation={0} sx={{ p: 4, backgroundColor: 'action.hover', borderRadius: 4, mb: 3 }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <TextInput source="Concepto" label="Descripción del Gasto" fullWidth multiline rows={8} validate={Requerido} />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <NumberInput
                                source="Importe"
                                label="Monto Pagado"
                                fullWidth
                                validate={Requerido}
                                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                            />
                            <Box sx={{ mt: 2 }}>
                                <ReferenceInput source="motelId" reference="moteles">
                                    <AutocompleteInput label='Motel Responsable' optionText='Nombre' fullWidth readOnly={true} />
                                </ReferenceInput>
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>
            </SimpleForm>
        </Edit>
    );
};

export const GastoCreate = () => {
    const { currentMotelId: motelId } = useMotel();

    return (
        <Create redirect="list" sx={{ mt: 2 }}>
            <SimpleForm
                toolbar={<CustomToolbar backTo="/gastos" />}
                validate={validateGasto}
                defaultValues={{ motelId: motelId }}
            >
                <SectionHeader icon={ExpenseIcon} title="Nuevo Gasto Externo" />
                <Paper elevation={0} sx={{ p: 4, backgroundColor: 'action.hover', borderRadius: 4, mb: 3 }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <TextInput source="Concepto" label="Descripción/Concepto" fullWidth multiline rows={8} validate={Requerido} />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <NumberInput
                                source="Importe"
                                label="Importe Total"
                                fullWidth
                                validate={Requerido}
                                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                            />
                            <Box sx={{ mt: 2 }}>
                                <ReferenceInput source="motelId" reference="moteles">
                                    <AutocompleteInput label='Asignar a Motel' optionText='Nombre' fullWidth validate={Requerido} />
                                </ReferenceInput>
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>
            </SimpleForm>
        </Create>
    );
};

const resource = {
    list: GastoList,
    edit: GastoEdit,
    create: GastoCreate,
};

export default resource;
