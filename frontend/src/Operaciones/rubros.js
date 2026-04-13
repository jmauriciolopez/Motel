import { Create, Edit, SimpleForm, TextInput, Datagrid, List, TextField, EditButton, BooleanField, useRecordContext, TopToolbar, CreateButton, usePermissions } from 'react-admin';
import { useDeletedRowSx } from '../helpers/deletedRowSx';
import CustomToolbar from '../layout/CustomToolbar';
import { Box, Typography, Chip } from '@mui/material';
import { Star as StarIcon } from '@mui/icons-material';

const RubroTitle = () => {
    const record = useRecordContext();
    return <span>Rubro: {record ? record.Nombre : ''}</span>;
};

const CustomEditButton = (props) => {
    const record = useRecordContext();
    if (!record || record.EsMaestro) return null;
    return <EditButton {...props} />;
};

export const RubroCreate = () => (
    <Create redirect="list">
        <SimpleForm toolbar={<CustomToolbar backTo="/rubros" />}>
            <TextInput source="Nombre" fullWidth />
        </SimpleForm>
    </Create>
);

const RubroListActions = () => {
    const { permissions } = usePermissions();
    const isSupervisor = permissions === 'Supervisor' || permissions === 'Administrador' || permissions === 'SuperAdmin';
    return (
        <TopToolbar>
            {isSupervisor && <CreateButton />}
        </TopToolbar>
    );
};

const RubroList = () => {
    const deletedRowSx = useDeletedRowSx();
    return (
    <List actions={<RubroListActions />} sx={{ '& .RaList-main': { marginTop: 2 } }}>
        <Datagrid
            rowClick={(id, resource, record) => record.EsMaestro ? false : "edit"}
            rowSx={deletedRowSx}
            sx={{
                '& .RaDatagrid-rowCell': { padding: '16px 8px' },
                '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary' }
            }}
        >
            <TextField source="Nombre" sx={{ fontWeight: 600, color: 'primary.main' }} />
            <BooleanField source="EsMaestro" label="Maestro" valueLabelTrue="Global" valueLabelFalse="Local"
                sx={{ '& .MuiSvgIcon-root': { color: 'gold' } }} />
            <CustomEditButton />
        </Datagrid>
    </List>
    );
};

export const RubroEdit = () => {
    return (
        <Edit mutationMode="pessimistic" title={<RubroTitle />}>
            <SimpleForm toolbar={<CustomToolbar backTo="/rubros" />}>
                <RubroBanner />
                <TextInput source="Nombre" fullWidth />
            </SimpleForm>
        </Edit>
    );
};

const RubroBanner = () => {
    const record = useRecordContext();
    if (!record || !record.EsMaestro) return null;
    return (
        <Box sx={{
            p: 2, mb: 2, bgcolor: 'info.light', borderRadius: 2,
            display: 'flex', alignItems: 'center', gap: 2, border: '1px solid', borderColor: 'info.main'
        }}>
            <StarIcon color="info" />
            <Box>
                <Typography variant="subtitle2" sx={{ color: 'info.dark', fontWeight: 700 }}>
                    RUBRO MAESTRO (LECTURA)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    Este rubro es parte del catálogo global y no puede ser modificado por moteles individuales.
                </Typography>
            </Box>
        </Box>
    );
}


const myObject = {
    list: RubroList,
    edit: RubroEdit,
    create: RubroCreate,
};
export default myObject;
