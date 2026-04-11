import React from 'react';
import { List, TextField, Datagrid, ReferenceInput, AutocompleteInput, DateField, Filter, SelectInput, BooleanField } from 'react-admin';
import { useMotel } from '../context/MotelContext';

const FiltroStocks = (props) => {
  return (
    <Filter {...props}>
      <ReferenceInput
        label="Deposito"
        source="depositoId"
        reference="depositos"
        alwaysOn
        pagination={{ page: 1, perPage: 300 }}>
        <AutocompleteInput optionText="Nombre" />
      </ReferenceInput>
      <ReferenceInput
        label="Rubro"
        source="producto.rubroId"
        reference="rubros"
        alwaysOn
        sort={{ field: 'Nombre', order: 'ASC' }}
        pagination={{ page: 1, perPage: 300 }}>
        <AutocompleteInput optionText="Nombre" label="Rubro" />
      </ReferenceInput>
      <SelectInput
        label="Facturable"
        source="producto.Facturable"
        choices={[
            { id: true, name: 'Sí' },
            { id: false, name: 'No' },
        ]}
        alwaysOn
      />
    </Filter>
  );
};

const StockReporte = (props) => {
    return (
        <List
            {...props}
            resource='stocks'
            hasCreate={false}
            exporter={false}
            filters={<FiltroStocks />}
            sort={{ field: 'id', order: 'DESC' }}
            title="Reporte de Stocks"
        >
            <Datagrid optimized>
                <TextField label="Deposito" source="deposito.Nombre" />
                <TextField label="Producto" source="producto.Nombre" />
                <TextField label="Rubro" source="producto.rubro.Nombre" />
                <BooleanField label="Fac." source="producto.Facturable" />
                <TextField source="Cantidad" />
                <DateField source="updatedAt" label="Actualizado" showTime={false} showDate={true} />
            </Datagrid>
        </List>
    );
}

export default StockReporte;
