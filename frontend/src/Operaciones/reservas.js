import React from 'react';
import {
    Datagrid,
    List,
    TextField,
    Edit,
    EditButton,
    AutocompleteInput,
    SimpleForm,
    TextInput,
    ReferenceInput,
    Create,
    DateTimeInput,
    SelectInput,
    DateField,
    Button,
    useRecordContext,
    FunctionField,
    TopToolbar,
    CreateButton,
    usePermissions
} from 'react-admin';
import { Grid, Box } from '@mui/material';
import {
    PlayCircle as PlayIcon,
    Add as AddIcon,
    Edit as EditIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import CustomToolbar from '../layout/CustomToolbar';
import { useMotel } from '../context/MotelContext';

const AZURE_BLUE = '#213894';
const TONAL_SURFACE = 'rgba(33, 56, 148, 0.04)';
const SOFT_HOVER = 'rgba(33, 56, 148, 0.08)';

const CheckInButton = () => {
    const record = useRecordContext();
    const isTerminal = ['Finalizada', 'Cancelada'].includes(record?.Estado);
    const errorRed = '#C62828';

    if (!record || isTerminal) return null;

    return (
        <Button
            label="Check-In"
            variant="text"
            startIcon={<PlayIcon sx={{ fontSize: '1.2rem' }} />}
            component={Link}
            to="/turnos/create"
            state={{
                record: {
                    habitacion: record.habitacion?.id || record.habitacion?.id,
                    cliente: record.cliente?.id || record.cliente?.id,
                    reservaReference: record.id || record.id
                }
            }}
            onClick={e => e.stopPropagation()}
            sx={{
                padding: '6px 12px',
                fontSize: '0.75rem',
                borderRadius: '8px',
                color: '#C62828', // Rojo semántico
                backgroundColor: 'rgba(198, 40, 40, 0.04)',
                '&:hover': { backgroundColor: 'rgba(198, 40, 40, 0.08)' },
                fontWeight: 700,
                textTransform: 'none'
            }}
        />
    );
};

const reservaFilters = [
    <TextInput label="Buscar" source="q" alwaysOn />,
    <ReferenceInput source="habitacionId" reference="habitaciones" key="habitacion">
        <AutocompleteInput optionText="Identificador" />
    </ReferenceInput>,
    <SelectInput source="Estado" choices={[
        { id: 'Pendiente', name: 'Pendiente' },
        { id: 'Confirmada', name: 'Confirmada' },
        { id: 'Cancelada', name: 'Cancelada' },
        { id: 'Finalizada', name: 'Finalizada' },
    ]} key="estado" />
];

const ReservaListActions = () => {
    const { permissions } = usePermissions();
    const canCreate = permissions === 'Recepcionista' || permissions === 'Supervisor' || permissions === 'Administrador' || permissions === 'SuperAdmin';
    return (
        <TopToolbar>
            {canCreate && <CreateButton label="Nueva Reserva" />}
        </TopToolbar>
    );
};

const ReservaList = () => {
    return (
        <List
            actions={<ReservaListActions />}
            filters={reservaFilters}
            sort={{ field: 'Ingreso', order: 'DESC' }}
            sx={{ '& .RaList-main': { marginTop: 2 } }}
        >
            <Datagrid
                rowClick={(id, resource, record) =>
                    ['Finalizada', 'Cancelada'].includes(record.Estado) ? false : "edit"
                }
                sx={{
                    '& .RaDatagrid-headerCell': {
                        fontWeight: 800,
                        backgroundColor: 'rgba(0,0,0,0.02)',
                        color: 'text.secondary',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        borderBottom: '1px solid rgba(0,0,0,0.05)'
                    },
                    '& .RaDatagrid-row:hover': { backgroundColor: 'rgba(33, 56, 148, 0.02)' },
                    '& .MuiTableCell-root': { borderBottom: '1px solid rgba(0,0,0,0.03)' }
                }}
            >
                <TextField source="habitacion.Identificador" label="Hab" sx={{ fontWeight: 800, color: AZURE_BLUE }} />
                <FunctionField
                    label="Fecha/Hora Ingreso"
                    render={record => record.Ingreso ? (
                        `${new Date(record.Ingreso).toLocaleDateString()} ${new Date(record.Ingreso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`
                    ) : ''}
                />
                <TextField source="habitacion.Identificador" label="Habitación" />
                <TextField source="cliente.Patente" label="Cliente (Patente)" />
                <TextField source="Estado" />
                <TextField label="Personal" source="usuario.Username" />
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                    <CheckInButton />
                    <FunctionField render={record =>
                        !['Finalizada', 'Cancelada'].includes(record.Estado) ? (
                            <EditButton
                                label="Editar"
                                icon={<EditIcon />}
                                sx={{
                                    color: AZURE_BLUE,
                                    backgroundColor: TONAL_SURFACE,
                                    borderRadius: '8px',
                                    '&:hover': { backgroundColor: SOFT_HOVER },
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    fontSize: '0.75rem'
                                }}
                            />
                        ) : null
                    } />
                </Box>
            </Datagrid>
        </List>
    );
};

const ReservaForm = ({ isCreate = false }) => {
    const { currentMotelId: motelId } = useMotel();
    const record = useRecordContext();
    const isReadOnly = !isCreate && ['Finalizada', 'Cancelada'].includes(record?.Estado);

    return (
        <SimpleForm toolbar={isReadOnly ? false : <CustomToolbar backTo="/reservas" />}>
            <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                    <ReferenceInput source="clienteId" reference="clientes">
                        <AutocompleteInput optionText="Patente" label="Cliente (Patente)" fullWidth readOnly={isReadOnly} disabled={isReadOnly} />
                    </ReferenceInput>
                </Grid>
                <Grid item xs={12} md={6}>
                    <ReferenceInput
                        source="habitacionId"
                        reference="habitaciones"
                    >
                        <AutocompleteInput optionText="Identificador" label="Habitación" fullWidth readOnly={isReadOnly} disabled={isReadOnly} />
                    </ReferenceInput>
                </Grid>
                <Grid item xs={12} md={6}>
                    <DateTimeInput source="Ingreso" fullWidth readOnly={isReadOnly} disabled={isReadOnly} />
                </Grid>
                <Grid item xs={12} md={6}>
                    <SelectInput source="Estado" choices={[
                        { id: 'Pendiente', name: 'Pendiente' },
                        { id: 'Confirmada', name: 'Confirmada' },
                        { id: 'Cancelada', name: 'Cancelada' },
                        { id: 'Finalizada', name: 'Finalizada' },
                    ]} fullWidth readOnly={isReadOnly} disabled={isReadOnly} />
                </Grid>
                <Grid item xs={12}>
                    <TextInput source="Notas" multiline rows={3} fullWidth readOnly={isReadOnly} disabled={isReadOnly} />
                </Grid>
            </Grid>
        </SimpleForm>
    );
};

export const ReservaEdit = () => (
    <Edit>
        <ReservaForm />
    </Edit>
);

export const ReservaCreate = () => (
    <Create redirect="list">
        <ReservaForm isCreate />
    </Create>
);

const resourceReservas = {
    list: ReservaList,
    edit: ReservaEdit,
    create: ReservaCreate
};

export default resourceReservas;
