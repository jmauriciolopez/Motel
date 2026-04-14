import React from 'react';
import { List, TextField, Datagrid, ReferenceInput, AutocompleteInput, DateField, Filter, SelectInput, BooleanField, useTranslate } from 'react-admin';
import { useMotel } from '../context/MotelContext';

const FiltroStocks = (props) => {
  const translate = useTranslate();
  return (
    <Filter {...props}>
      <ReferenceInput
        label={translate('pos.reports.warehouse')}
        source="depositoId"
        reference="depositos"
        alwaysOn
        pagination={{ page: 1, perPage: 300 }}>
        <AutocompleteInput optionText="Nombre" />
      </ReferenceInput>
      <ReferenceInput
        label={translate('pos.reports.category')}
        source="producto.rubroId"
        reference="rubros"
        alwaysOn
        sort={{ field: 'Nombre', order: 'ASC' }}
        pagination={{ page: 1, perPage: 300 }}>
        <AutocompleteInput optionText="Nombre" label={translate('pos.reports.category')} />
      </ReferenceInput>
      <SelectInput
        label={translate('pos.reports.billable')}
        source="producto.Facturable"
        choices={[
            { id: true, name: translate('pos.dashboard.yes') },
            { id: false, name: translate('pos.dashboard.no') },
        ]}
        alwaysOn
      />
    </Filter>
  );
};

const StockReporte = (props) => {
    const translate = useTranslate();
    const { currentMotelId } = useMotel();
    return (
        <List
            {...props}
            resource='stocks'
            hasCreate={false}
            exporter={false}
            filters={<FiltroStocks />}
            filter={{ motelId: currentMotelId }}
            sort={{ field: 'id', order: 'DESC' }}
            title={translate('pos.reports.stock_report')}
            queryOptions={{ 
                meta: { 
                    include: { 
                        deposito: true,
                        producto: {
                            include: {
                                rubro: true
                            }
                        }
                    } 
                } 
            }}
        >
            <Datagrid optimized>
                <TextField label={translate('pos.reports.warehouse')} source="deposito.Nombre" />
                <TextField label={translate('pos.reports.product')} source="producto.Nombre" />
                <TextField label={translate('pos.reports.category')} source="producto.rubro.Nombre" />
                <BooleanField label={translate('pos.reports.billable')} source="producto.Facturable" />
                <TextField source="Cantidad" label={translate('pos.reports.quantity')} />
                <DateField source="updatedAt" label={translate('pos.reports.updated')} showTime={false} showDate={true} />
            </Datagrid>
        </List>
    );
}

export default StockReporte;
