import React from 'react';
import { useLocaleState } from 'react-admin';
import { Button, Menu, MenuItem, Tooltip, Box } from '@mui/material';
import { Languages, ChevronDown } from 'lucide-react';

const LanguageSwitcher = () => {
    const [locale, setLocale] = useLocaleState();
    const [anchorEl, setAnchorEl] = React.useState(null);
    const open = Boolean(anchorEl);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const changeLocale = (newLocale) => {
        setLocale(newLocale);
        handleClose();
    };

    const languages = [
        { id: 'es', name: 'Español' },
        { id: 'pt', name: 'Português' },
    ];

    const currentLanguage = languages.find(l => l.id === locale) || languages[0];

    return (
        <Box sx={{ ml: 1, display: 'inline-flex' }}>
            <Tooltip title="Cambiar Idioma">
                <Button
                    onClick={handleClick}
                    color="inherit"
                    startIcon={<Languages size={18} />}
                    endIcon={<ChevronDown size={14} />}
                    sx={{
                        textTransform: 'none',
                        color: '#e0e7ff',
                        bgcolor: 'rgba(255,255,255,0.05)',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        '&:hover': {
                            bgcolor: 'rgba(255,255,255,0.1)',
                            borderColor: 'rgba(255,255,255,0.2)'
                        }
                    }}
                >
                    {!window.matchMedia('(max-width: 600px)').matches && currentLanguage.name}
                </Button>
            </Tooltip>
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                PaperProps={{
                    sx: {
                        mt: 1,
                        borderRadius: '12px',
                        minWidth: 150,
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    }
                }}
            >
                {languages.map((lang) => (
                    <MenuItem
                        key={lang.id}
                        selected={lang.id === locale}
                        onClick={() => changeLocale(lang.id)}
                        sx={{
                            fontSize: '0.875rem',
                            fontWeight: lang.id === locale ? 700 : 400,
                        }}
                    >
                        {lang.name}
                    </MenuItem>
                ))}
            </Menu>
        </Box>
    );
};

export default LanguageSwitcher;
