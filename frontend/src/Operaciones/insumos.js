import React from 'react';
import {
    Datagrid, List, TextField, Edit, EditButton, AutocompleteInput, SimpleForm, ReferenceInput, Create, DateField,
    useRecordContext, required, DateTimeInput, TextInput, useGetList, BooleanInput, useDataProvider, useNotify, useRefresh
} from 'react-admin';
import { useMotel } from '../context/MotelContext';
import { Link } from 'react-router-dom';
import { Grid, Button } from '@mui/material';
import CustomToolbar from '../layout/CustomToolbar';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const validateInsumoCreate = (values) => {
    const errors = {};
    if (!values.depositoId) {
        errors.depositoId = 'Se requiere depósito de registro';
    }
    if (!values.Fecha) {
        errors.Fecha = 'Completar fecha';
    }
    return errors;
};

const DetailsButton = () => {
    const record = useRecordContext();
    if (!record) return null;
    return (
        <Button
            variant="outlined"
            color="primary"
            size="small"
            startIcon={<ListAltIcon />}
            onClick={e => e.stopPropagation()}
            component={Link}
            title="Ver detalles"
            to={{
                pathname: '/insumodetalles',
                search: `?filter=${JSON.stringify({ "insumoId": record.id })}`
            }}
        >
            Detalles
        </Button>
    );
};

const AddDetailButton = () => {
    const record = useRecordContext();
    if (!record || record.Finalizada) return null;
    return (
        <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={<AddCircleOutlineIcon />}
            onClick={e => e.stopPropagation()}
            title="Cargar productos"
            component={Link}
            to={{
                pathname: '/insumodetalles/create',
                search: `?insumo=${record.id}`
            }}
        >
            Cargar
        </Button>
    );
};

const FinalizarButton = () => {
    const record = useRecordContext();
    const dataProvider = useDataProvider();
    const notify = useNotify();
    const refresh = useRefresh();

    if (!record) return null;
    if (record.Finalizada) return (
        <CheckCircleIcon color="success" titleAccess="Finalizado" sx={{ verticalAlign: 'middle' }} />
    );

    return (
        <Button
            variant="outlined"
            color="warning"
            size="small"
            startIcon={<CheckCircleOutlineIcon />}
            onClick={async e => {
                e.stopPropagation();
                try {
                    await dataProvider.update('insumos', {
                        id: record.id,
                        data: { Finalizada: true },
                        previousData: record,
                    });
                    notify('Insumo finalizado', { type: 'success' });
                    refresh();
                } catch {
                    notify('Error al finalizar', { type: 'error' });
                }
            }}
        >
            Finalizar
        </Button>
    );
};

const InsumoList = () => {
    const { currentMotelId: motelId } = useMotel();
    const filter = React.useMemo(() => (
        motelId ? { motelId: motelId } : {}
    ), [motelId]);

    return (
        <List 
            filter={filter} 
            resource="insumos" 
            sort={{ field: 'Fecha', order: 'DESC' }}
            sx={{ '& .RaList-main': { marginTop: 2 } }}
        >
            <Datagrid bulkActionButtons={false} rowClick={false}>
                <DetailsButton />
                <AddDetailButton />
                <DateField 
                    source="Fecha" 
                    label="Fecha" 
                    showTime 
                    options={{ day: '2-digit', month: '2-digit', year: 'numeric', hour12: true, hour: '2-digit', minute: '2-digit' }} 
                />
                <TextField label="Depósito" source="deposito.Nombre" />
                <TextField label="Observación" source="Observacion" />
                <TextField label="Personal" source="usuario.Username" />
                <FinalizarButton />
                <EditButton />
            </Datagrid>
        </List>
    );
};

export const InsumoEdit = () => (
    <Edit mutationMode="pessimistic">
        <SimpleForm toolbar={<CustomToolbar backTo="/insumos" />}>
            <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                    <DateTimeInput source="Fecha" label="Fecha" validate={required()} />
                    <ReferenceInput 
                        source="depositoId" 
                        reference="depositos"
                        filter={{ EsPrincipal: false }}
                    >
                        <AutocompleteInput label='Depósito' optionText='Nombre' validate={required()} />
                    </ReferenceInput>
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextInput source="Observacion" label="Observación" multiline fullWidth />
                    <BooleanInput source="Finalizada" label="Insumo Finalizado (No permite cargar más productos)" />
                </Grid>
            </Grid>
        </SimpleForm>
    </Edit>
);

export const InsumoCreate = () => {
    const { data: depositos } = useGetList('depositos', {
        pagination: { page: 1, perPage: 1 },
        filter: { EsPrincipal: false },
        sort: { field: 'Nombre', order: 'ASC' },
    });

    const defaultValues = React.useMemo(() => {
        const base = { Fecha: new Date(), Finalizada: false };
        if (depositos && depositos.length > 0) {
            base.depositoId = depositos[0].id;
        }
        return base;
    }, [depositos]);

    return (
        <Create
            redirect={(resource, id) => `/insumodetalles/create?insumo=${id}`}
            sx={{ mt: 2 }}
            transform={(data) => {
                const { deposito, usuario, motel, depositoInfo, detalles, ...clean } = data;
                const f = clean.Fecha;
                const fecha =
                    f instanceof Date ? f.toISOString() : typeof f === 'string' ? f : new Date(f).toISOString();
                return {
                    fecha,
                    observacion: clean.Observacion,
                    finalizada: clean.Finalizada ?? false,
                    depositoId: clean.depositoId,
                    detalles: [],
                };
            }}
        >
            <SimpleForm 
                defaultValues={defaultValues} 
                toolbar={<CustomToolbar backTo="/insumos" />}
                validate={validateInsumoCreate}
            >
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <DateTimeInput source="Fecha" label="Fecha" validate={required()} fullWidth />
                        <TextInput
                            source="depositoInfo"
                            label="Depósito / registro"
                            defaultValue="Al finalizar, el stock se descuenta del depósito secundario del motel (no del principal)"
                            fullWidth
                            disabled
                        />
                        <TextInput source="depositoId" sx={{ display: 'none' }} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextInput source="Observacion" label="Observación" multiline fullWidth />
                    </Grid>
                </Grid>
            </SimpleForm>
        </Create>
    );
};

const resourceInsumos = {
    list: InsumoList,
    edit: InsumoEdit,
    create: InsumoCreate,
};

export default resourceInsumos;
