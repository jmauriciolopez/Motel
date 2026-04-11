import React from 'react';
import { Toolbar, SaveButton, Button, DeleteButton, useRedirect } from 'react-admin';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Box } from '@mui/material';

const CustomToolbar = ({ backTo = '/turnos', showDelete = false, deleteRedirect, ...props }) => {
    const redirect = useRedirect();
    
    return (
        <Toolbar {...props} sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <SaveButton />
            <Box sx={{ display: 'flex', gap: 1 }}>
                {showDelete && (
                    <DeleteButton
                        mutationMode="pessimistic"
                        redirect={deleteRedirect || backTo}
                    />
                )}
                <Button
                    label="Cancelar"
                    onClick={() => redirect(backTo)}
                    startIcon={<ArrowBackIcon />}
                    variant="text"
                />
            </Box>
        </Toolbar>
    );
};

export default CustomToolbar;
