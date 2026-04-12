import React from 'react';


import {
    Datagrid, List, TextField, Edit, EditButton, NumberField, NumberInput, AutocompleteInput, SimpleForm, TextInput, ReferenceInput, Create, DateField,
    useRecordContext, required, useDataProvider, useNotify, ReferenceField, DateTimeInput, BooleanField, BooleanInput, useGetList, DateInput,
    CreateButton, TopToolbar, usePermissions, useRefresh
} from 'react-admin';
import { canManageCompras } from '../helpers/roles';
import { Link } from 'react-router-dom';
import { Grid, Button } from '@mui/material';
import CustomToolbar from '../layout/CustomToolbar';
import SpeakerNotesIcon from '@mui/icons-material/SpeakerNotes';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const Requerido = [required()];
const validateUserCreation = (values) => {
    const errors = {};
    if (!values.depositoId) {
        errors.depositoId = 'Completar Depósito';
    }
    if (!values.Fecha) {
        errors.Fecha = 'Completar Fecha';
    }
    return errors;
};


// const ListToolbar = () => (
//     <Stack direction="row" justifyContent="space-between">
//         <FilterForm filters={Filtros} />
//         <div>
//             <FilterButton filters={Filtros} />
//         </div>
//         <CreateButton />

//     </Stack>
// )


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
                pathname: '/compradetalles',
                search: `?filter=${JSON.stringify({ "compraId": record.id })}`
            }}
        >
            Detalles
        </Button>
    );
};

const AddDetailButton = () => {
    const { permissions } = usePermissions();
    const isSupervisor = canManageCompras(permissions);
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
                pathname: '/compradetalles/create',
                search: `?compraId=${record.id}`
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
                    await dataProvider.update('compras', {
                        id: record.id,
                        data: { Finalizada: true },
                        previousData: record,
                    });
                    notify('Compra finalizada', { type: 'success' });
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

const CompraListActions = () => {
    const { permissions } = usePermissions();
    const isSupervisor = canManageCompras(permissions);
    return (
        <TopToolbar>
            {isSupervisor && <CreateButton />}
        </TopToolbar>
    );
};

const CompraList = () => {
    return (
        <List
            actions={<CompraListActions />}
            sort={{ field: 'Fecha', order: 'DESC' }}
            disableSyncWithLocation
            sx={{ '& .RaList-main': { marginTop: 2 } }}
        >
            <Datagrid bulkActionButtons={false} rowClick={false} sx={{
                '& .RaDatagrid-rowCell': { padding: '16px 8px' },
                '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary' }
            }}>
                <DetailsButton />
                <AddDetailButton />
                <DateField source="Fecha" label="Fecha" showTime={false} showDate={true} />
                <TextField label="Proveedor" source="proveedor.Nombre" />
                <TextField label="Depósito" source="deposito.Nombre" />
                <TextField label="Personal" source="usuario.Username" />
                <NumberField source="Total" options={{ style: 'currency', currency: 'ARS' }} sx={{ fontWeight: 600, color: 'success.main' }} />
                <FinalizarButton />
                <EditButton />
            </Datagrid>
        </List>
    );
};
export const CompraEdit = () => {
    return (
        <Edit mutationMode="pessimistic">
            <SimpleForm toolbar={<CustomToolbar backTo="/compras" />}>
                <Grid container spacing={1}>
                    <Grid item xs={6}>
                        <DateInput source="Fecha" label="Fecha" readOnly />
                        <ReferenceInput source="proveedorId" reference="proveedores" sort={{ field: 'Nombre', order: 'ASC' }}>
                            <AutocompleteInput label='Proveedor' optionText='Nombre' validate={Requerido} />
                        </ReferenceInput>
                    </Grid>
                    <Grid item xs={6}>
                        <BooleanInput source="Finalizada" label="Compra Finalizada (No permite cargar más productos)" />
                    </Grid>
                </Grid>
            </SimpleForm>
        </Edit>
    );
};

export const CompraCreate = () => {
    // Buscar el depósito principal para precargar
    const { data: depositos } = useGetList('depositos', {
        pagination: { page: 1, perPage: 1 },
        filter: { EsPrincipal: true }
    });

    const defaultValues = React.useMemo(() => {
        const base = {
            Fecha: new Date().toISOString().split('T')[0],
            Finalizada: false
        };
        if (depositos && depositos.length > 0) {
            base.depositoId = depositos[0].id;
        }
        return base;
    }, [depositos]);

    return (
        <Create
            redirect={(resource, id) => `/compradetalles/create?compraId=${id}`}
            sx={{ mt: 2 }}
            transform={(data) => {
                const { deposito, proveedor, usuario, detalles, depositoInfo, ...clean } = data;
                return {
                    fecha: clean.Fecha,
                    total: clean.Total ?? 0,
                    finalizada: clean.Finalizada ?? false,
                    depositoId: clean.depositoId,
                    proveedorId: clean.proveedorId,
                };
            }}
        >
            <SimpleForm
                toolbar={<CustomToolbar backTo="/compras" />}
                validate={validateUserCreation}
                defaultValues={defaultValues}
            >
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <DateInput source="Fecha" label="Fecha" validate={required()} fullWidth />
                        <ReferenceInput source="proveedorId" reference="proveedores" sort={{ field: 'Nombre', order: 'ASC' }}>
                            <AutocompleteInput label='Proveedor' optionText='Nombre' validate={Requerido} fullWidth />
                        </ReferenceInput>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextInput
                            source="depositoInfo"
                            label="Depósito de ingreso"
                            defaultValue="Se ingresará automáticamente al depósito principal del motel"
                            fullWidth
                            disabled
                        />
                        <TextInput source="depositoId" sx={{ display: 'none' }} />
                        <BooleanInput source="Finalizada" label="Finalizada" />
                    </Grid>
                </Grid>
            </SimpleForm>
        </Create>
    );
};



const resourceCompras = {
    list: CompraList,
    edit: CompraEdit,
    create: CompraCreate,

};
export default resourceCompras;
