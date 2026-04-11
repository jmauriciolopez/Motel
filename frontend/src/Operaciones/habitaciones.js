import {
    Create, Edit, SimpleForm, TextInput, BooleanInput, ReferenceInput, useCreate, useNotify, useRedirect,
    SaveButton, Toolbar, FormDataConsumer, NumberInput, Datagrid, List, TextField, EditButton,
    BooleanField, AutocompleteInput, required, DateField, NumberField, ReferenceField,
    FunctionField, usePermissions, useRecordContext
} from 'react-admin';
import { Grid, Box, Button, Chip, Paper, Typography, Divider } from '@mui/material';
import { useMotel } from '../context/MotelContext';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BuildIcon from '@mui/icons-material/Build';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import PriceCheckIcon from '@mui/icons-material/PriceCheck';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import DomainIcon from '@mui/icons-material/Domain';
import CustomToolbar from '../layout/CustomToolbar';

const Requerido = [required()];

// -- Helper Components --
const SectionHeader = ({ icon: Icon, title }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 3, mb: 2 }}>
        <Icon color="primary" fontSize="small" />
        <Typography variant="subtitle1" fontWeight="700" color="primary">
            {title.toUpperCase()}
        </Typography>
    </Box>
);

const HabitacionStatusBanner = () => {
    const record = useRecordContext();
    if (!record) return null;

    const state = record.Estado?.toLowerCase();
    let color = 'primary';
    let label = record.Estado || 'DESCONOCIDO';

    if (state === 'libre') color = 'success';
    else if (state === 'ocupada') color = 'error';
    else if (state === 'mantenimiento' || state === 'porlimpiar') color = 'warning';

    return (
        <Paper elevation={0} sx={{
            p: 2,
            mb: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderLeft: `6px solid`,
            borderColor: `${color}.main`,
            backgroundColor: `${color}.light`,
            opacity: 0.9,
            borderRadius: '8px'
        }}>
            <Box>
                <Typography variant="overline" display="block" sx={{ color: 'text.secondary', fontWeight: 'bold', lineHeight: 1 }}>
                    Estado de Habitación
                </Typography>
                <Typography variant="h5" fontWeight="900" color={`${color}.dark`}>
                    {record.Identificador}
                </Typography>
            </Box>
            <Chip
                label={label.toUpperCase()}
                variant="filled"
                color={color}
                sx={{ fontWeight: 'bold', px: 2 }}
            />
        </Paper>
    );
};

export const HabitacionCreate = () => {
    const [create] = useCreate();
    const notify = useNotify();
    const redirect = useRedirect();

    const handleSave = async (data) => {
        if (!data.Multiple) {
            create('habitaciones', { data }, {
                onSuccess: () => {
                    notify('Habitación creada', { type: 'info' });
                    redirect('list', 'habitaciones');
                },
                onError: (error) => notify(`Error: ${error.message}`, { type: 'warning' })
            });
            return;
        }

        const { Prefijo, RangoDesde, RangoHasta, Multiple, ...commonData } = data;
        const desde = String(RangoDesde).trim();
        const hasta = String(RangoHasta).trim();

        const isLetter = (c) => /^[a-zA-Z]$/.test(c);
        const isNumeric = (n) => !isNaN(parseInt(n)) && /^\d+$/.test(n);

        if ((isLetter(desde) && isNumeric(hasta)) || (isNumeric(desde) && isLetter(hasta))) {
            notify('No se pueden mezclar letras y números en el rango', { type: 'warning' });
            return;
        }

        const isLetterRange = isLetter(desde) && isLetter(hasta);
        let sequence = [];

        if (isLetterRange) {
            const startCode = desde.charCodeAt(0);
            const endCode = hasta.charCodeAt(0);
            if (startCode <= endCode) {
                for (let i = startCode; i <= endCode; i++) {
                    sequence.push(String.fromCharCode(i));
                }
            }
        } else {
            const startNum = parseInt(desde);
            const endNum = parseInt(hasta);
            if (!isNaN(startNum) && !isNaN(endNum) && startNum <= endNum) {
                for (let i = startNum; i <= endNum; i++) {
                    sequence.push(i);
                }
            }
        }

        if (sequence.length === 0) {
            notify('Rango inválido o incompleto', { type: 'warning' });
            return;
        }

        try {
            for (const val of sequence) {
                const ident = `${Prefijo || ''}${val}`;
                await create('habitaciones', { data: { ...commonData, Identificador: ident } }, { returnPromise: true });
            }
            notify(`${sequence.length} habitaciones creadas correctamente`, { type: 'info' });
            redirect('list', 'habitaciones');
        } catch (error) {
            notify(`Error en creación masiva: ${error.message}`, { type: 'warning' });
        }
    };

    return (
        <Create redirect="list">
            <SimpleForm
                toolbar={
                    <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <SaveButton alwaysEnable />
                        <Button
                            onClick={() => redirect('/habitaciones')}
                            startIcon={<ArrowBackIcon />}
                            sx={{ color: 'text.secondary' }}
                        >
                            Cancelar
                        </Button>
                    </Toolbar>
                }
                onSubmit={handleSave}
            >
                <SectionHeader icon={MeetingRoomIcon} title="Identificación" />
                <Paper elevation={0} sx={{ p: 3, backgroundColor: 'action.hover', borderRadius: 2, mb: 3 }}>
                    <Grid container spacing={3} alignItems="center">
                        <Grid item xs={12} md={4}>
                            <BooleanInput source="Multiple" label="Creación Múltiple" sx={{ mt: 1 }} />
                        </Grid>
                        <Grid item xs={12} md={8}>
                            <FormDataConsumer>
                                {({ formData, ...rest }) => !formData.Multiple ? (
                                    <TextInput source="Identificador" validate={Requerido} fullWidth {...rest} />
                                ) : (
                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                        <TextInput source="Prefijo" label="Prefijo (ej: A)" sx={{ flex: 1 }} {...rest} />
                                        <TextInput source="RangoDesde" label="Desde" validate={Requerido} sx={{ flex: 1 }} {...rest} />
                                        <TextInput source="RangoHasta" label="Hasta" validate={Requerido} sx={{ flex: 1 }} {...rest} />
                                    </Box>
                                )}
                            </FormDataConsumer>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextInput source="Nombre" label="Nombre (Opcional)" fullWidth />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <BooleanInput source="Activa" defaultValue={true} />
                        </Grid>
                    </Grid>
                </Paper>

                <SectionHeader icon={DomainIcon} title="Ubicación y Tarifa" />
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <ReferenceInput source="motelId" reference="moteles">
                            <AutocompleteInput label='Motel Asignado' optionText='Nombre' validate={Requerido} fullWidth />
                        </ReferenceInput>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <ReferenceInput source="tarifaId" reference="tarifas">
                            <AutocompleteInput label='Tarifa Aplicada' optionText='Nombre' validate={Requerido} fullWidth />
                        </ReferenceInput>
                    </Grid>
                </Grid>
            </SimpleForm>
        </Create>
    );
};

const postFilters = [
    <TextInput label="Buscar" source="q" alwaysOn />,
];

export const HabitacionList = () => {
    const { permissions } = usePermissions();
    const isAdmin = permissions === 'Administrador';
    const { currentMotelId: motelId } = useMotel();
    const filter = motelId ? { motelId: motelId } : {};

    return (
        <List filters={postFilters} filter={filter} sx={{ '& .RaList-main': { marginTop: 2 } }}
            queryOptions={{ meta: { include: { motel: true, tarifa: true } } }}>
            <Datagrid rowClick={isAdmin ? "edit" : false} sx={{
                '& .RaDatagrid-rowCell': { padding: '16px 8px' },
                '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary' }
            }}>
                <TextField source="Identificador" sx={{ fontWeight: 600, color: 'primary.main' }} />
                <TextField label="Motel" source="motel.Nombre" />
                <TextField label="Tarifa" source="tarifa.Nombre" />
                <BooleanField source="Activa" />
                <FunctionField
                    label="Estado"
                    render={record => {
                        const state = record.Estado?.toLowerCase();
                        let color = 'primary';
                        let label = record.Estado;

                        if (state === 'mantenimiento') {
                            return (
                                <Chip
                                    label="MANTENIMIENTO"
                                    size="small"
                                    icon={<BuildIcon style={{ fontSize: '0.9rem' }} />}
                                    sx={{
                                        bgcolor: '#94a3b8',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        '& .MuiChip-icon': { color: 'inherit' }
                                    }}
                                />
                            );
                        } else if (state === 'libre') color = 'success';
                        else if (state === 'ocupada') color = 'error';
                        else if (['sucio', 'porlimpiar'].some(s => state?.includes(s))) color = 'warning';

                        return <Chip label={label?.toUpperCase()} color={color} size="small" sx={{ fontWeight: 'bold' }} />;
                    }}
                />
                {isAdmin && <EditButton />}
            </Datagrid>
        </List>
    );
};

export const HabitacionEdit = () => {
    return (
        <Edit mutationMode="pessimistic">
            <SimpleForm toolbar={<CustomToolbar backTo="/habitaciones" />}>
                <HabitacionStatusBanner />

                <SectionHeader icon={MeetingRoomIcon} title="General" />
                <Paper elevation={0} sx={{ p: 3, backgroundColor: 'action.hover', borderRadius: 2, mb: 3 }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <TextInput source="Identificador" validate={Requerido} fullWidth />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextInput source="Nombre" fullWidth />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <BooleanInput source="Activa" />
                        </Grid>
                    </Grid>
                </Paper>

                <SectionHeader icon={PriceCheckIcon} title="Vinculación" />
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <ReferenceInput source="motelId" reference="moteles">
                            <AutocompleteInput label='Motel' optionText='Nombre' validate={Requerido} fullWidth />
                        </ReferenceInput>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <ReferenceInput source="tarifaId" reference="tarifas">
                            <AutocompleteInput label='Tarifa' optionText='Nombre' validate={Requerido} fullWidth />
                        </ReferenceInput>
                    </Grid>
                </Grid>
            </SimpleForm>
        </Edit>
    );
}

const rooms = {
    list: HabitacionList,
    edit: HabitacionEdit,
    create: HabitacionCreate,
};
export default rooms;
