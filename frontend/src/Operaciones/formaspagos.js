import React from 'react';
import { Datagrid, List, TextField } from 'react-admin';

export const FormaPagoList = () => (
    <List 
        actions={null} 
        sx={{ '& .RaList-main': { marginTop: 2 } }}
        pagination={false} // Al ser solo 4, no hace falta paginar
    >
        <Datagrid
            bulkActionButtons={false}
            sx={{
                '& .RaDatagrid-rowCell': { padding: '16px 8px' },
                '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary' }
            }}
        >
            <TextField source="Tipo" sx={{ fontWeight: 600, color: 'primary.main' }} />
        </Datagrid>
    </List>
);

const formaPagoResource = {
    list: FormaPagoList,
};

export default formaPagoResource;
