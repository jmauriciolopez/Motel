import React from 'react';
import {
    Datagrid, List, TextField, Edit, EditButton, AutocompleteInput, SimpleForm, ReferenceInput, Create, DateField,
    useRecordContext, required, DateTimeInput, TextInput, useGetList, usePermissions, TopToolbar, CreateButton,
    useDataProvider, useNotify, useRefresh, BooleanInput
} from 'react-admin';
import { useMotel } from '../context/MotelContext';
import { Link } from 'react-router-dom';
import { Grid, Button } from '@mui/material';
import CustomToolbar from '../layout/CustomToolbar';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

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
                pathname: '/transferenciadetalles',
                search: `?filter=${JSON.stringify({ "transferenciaId": record.id })}`
            }}
        >
            Detalles
        </Button>
    );
};

const AddDetailButton = () => {
    const { permissions } = usePermissions();
    const isSupervisor = permissions === 'Supervisor' || permissions === 'Administrador' || permissions === 'SuperAdmin';
    const record = useRecordContext();
    if (!record || record.Finalizada || !isSupervisor) return null;
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
                pathname: '/transferenciadetalles/create',
                search: `transferencia=${record.id}`
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
        <CheckCircleIcon color="success" titleAccess="Finalizada" sx={{ verticalAlign: 'middle' }} />
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
                    await dataProvider.update('transferencias', {
                        id: record.id,
                        data: { Finalizada: true },
                        previousData: record,
                    });
                    notify('Transferencia finalizada', { type: 'success' });
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

const TransferenciaListActions = () => {
    const { permissions } = usePermissions();
    const isSupervisor = permissions === 'Supervisor' || permissions === 'Administrador' || permissions === 'SuperAdmin';

    return (
        <TopToolbar>
            {isSupervisor && <CreateButton />}
        </TopToolbar>
    );
};

const TransferenciaList = () => {
    return (
        <List
            resource="transferencias"
            actions={<TransferenciaListActions />}
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
                <TextField label="Origen" source="depositoOrigen.Nombre" />
                <TextField label="Destino" source="depositoDestino.Nombre" />
                <TextField label="Observación" source="Observacion" />
                <TextField label="Personal" source="usuario.Username" />
                <FinalizarButton />
                <EditButtonWrapper />
            </Datagrid>
        </List>
    );
};

const EditButtonWrapper = () => {
    const { permissions } = usePermissions();
    const isSupervisor = permissions === 'Supervisor' || permissions === 'Administrador' || permissions === 'SuperAdmin';
    if (!isSupervisor) return null;
    return <EditButton />;
};

export const TransferenciaEdit = () => (
    <Edit mutationMode="pessimistic">
        <SimpleForm toolbar={<CustomToolbar backTo="/transferencias" />}>
            <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                    <DateTimeInput source="Fecha" label="Fecha" validate={required()} />
                    <ReferenceInput source="depositoOrigenId" reference="depositos" filter={{ EsPrincipal: true }}>
                        <AutocompleteInput label='Origen' optionText='Nombre' validate={required()} />
                    </ReferenceInput>
                    <ReferenceInput source="depositoDestinoId" reference="depositos" filter={{ EsPrincipal: false }}>
                        <AutocompleteInput label='Destino' optionText='Nombre' validate={required()} />
                    </ReferenceInput>
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextInput source="Observacion" label="Observación" multiline fullWidth />
                    <BooleanInput source="Finalizada" label="Transferencia Finalizada (No permite cargar más productos)" />
                </Grid>
            </Grid>
        </SimpleForm>
    </Edit>
);

export const TransferenciaCreate = () => {
    const { data: depOrigen } = useGetList('depositos', {
        pagination: { page: 1, perPage: 1 },
        filter: { EsPrincipal: true }
    });

    const { data: depDestino } = useGetList('depositos', {
        pagination: { page: 1, perPage: 1 },
        filter: { EsPrincipal: false }
    });

    const defaultValues = React.useMemo(() => {
        const base = { Fecha: new Date() };
        if (depOrigen?.length > 0) base.depositoOrigenId = depOrigen[0].id;
        if (depDestino?.length > 0) base.depositoDestinoId = depDestino[0].id;
        return base;
    }, [depOrigen, depDestino]);

    return (
        <Create redirect="list" sx={{ mt: 2 }}>
            <SimpleForm
                defaultValues={defaultValues}
                toolbar={<CustomToolbar backTo="/transferencias" />}
            >
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <DateTimeInput source="Fecha" label="Fecha" validate={required()} fullWidth />
                        <ReferenceInput
                            source="depositoOrigenId"
                            reference="depositos"
                            filter={{ EsPrincipal: true }}
                        >
                            <AutocompleteInput label='Origen (Principal)' optionText='Nombre' validate={required()} fullWidth />
                        </ReferenceInput>
                        <ReferenceInput
                            source="depositoDestinoId"
                            reference="depositos"
                            filter={{ EsPrincipal: false }}
                        >
                            <AutocompleteInput label='Destino' optionText='Nombre' validate={required()} fullWidth />
                        </ReferenceInput>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextInput source="Observacion" label="Observación" multiline fullWidth rows={3} />
                    </Grid>
                </Grid>
            </SimpleForm>
        </Create>
    );
};

const resourceTransferencias = {
    list: TransferenciaList,
    edit: TransferenciaEdit,
    create: TransferenciaCreate,
};

export default resourceTransferencias;
