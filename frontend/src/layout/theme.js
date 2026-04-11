import { defaultTheme } from 'react-admin';

export const customTheme = {
    ...defaultTheme,
    palette: {
        mode: 'light',
        primary: {
            main: '#4338ca', // Indigo 700
            light: '#6366f1',
            dark: '#312e81',
        },
        secondary: {
            main: '#ec4899', // Pink
            light: '#f472b6',
            dark: '#be185d',
        },
        background: {
            default: '#f8fafc', // Slate 50
            paper: '#ffffff',
        },
        text: {
            primary: '#0f172a', // Slate 900
            secondary: '#64748b', // Slate 500
        }
    },
    shape: {
        borderRadius: 16, // Smoother rounded corners
    },
    typography: {
        fontFamily: "'Outfit', 'Inter', sans-serif",
        h1: { fontWeight: 700, fontSize: '2.5rem' },
        h2: { fontWeight: 700, fontSize: '2rem' },
        h3: { fontWeight: 600, fontSize: '1.75rem' },
        h4: { fontWeight: 600, fontSize: '1.5rem' },
        h5: { fontWeight: 600, fontSize: '1.25rem' },
        h6: { fontWeight: 600, fontSize: '1.1rem', letterSpacing: 0.5 },
        button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
        RaMenuItemLink: {
            styleOverrides: {
                root: {
                    borderLeft: '4px solid transparent',
                    margin: '4px 8px',
                    borderRadius: '8px',
                    color: '#475569',
                    transition: 'all 0.2s',
                    '&:hover': {
                        backgroundColor: '#f1f5f9',
                        color: '#1e293b',
                    },
                    '&.RaMenuItemLink-active': {
                        borderLeft: '4px solid #4338ca',
                        backgroundColor: '#eef2ff',
                        color: '#4338ca',
                        fontWeight: 'bold',
                        '& .MuiListItemIcon-root': {
                            color: '#4338ca',
                        }
                    },
                    '& .MuiListItemIcon-root': {
                        color: '#64748b',
                    }
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: '#1e1b4b', // Deep indigo
                    color: '#ffffff',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: '8px',
                    padding: '8px 16px',
                },
                contained: {
                    boxShadow: '0 4px 6px -1px rgba(67, 56, 202, 0.2), 0 2px 4px -1px rgba(67, 56, 202, 0.1)',
                    '&:hover': {
                        boxShadow: '0 10px 15px -3px rgba(67, 56, 202, 0.3), 0 4px 6px -2px rgba(67, 56, 202, 0.15)',
                    }
                }
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    overflow: 'visible', // Fixes issue with dropdowns in cards
                },
            },
        },
        MuiTableRow: {
            styleOverrides: {
                root: {
                    transition: 'background-color 0.2s',
                    '&:last-child td': { borderBottom: 0 },
                    '&:hover': {
                        backgroundColor: '#f8fafc !important',
                    },
                    '&.Mui-selected': {
                        backgroundColor: '#eff6ff',
                        '&:hover': {
                            backgroundColor: '#e0f2fe !important',
                        }
                    }
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                head: {
                    fontWeight: 700,
                    color: '#0f172a', // Slate 900
                    backgroundColor: '#f1f5f9', // Slate 100
                    borderBottom: '2px solid #e2e8f0',
                    fontSize: '0.875rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                },
                body: {
                    color: '#1e293b', // Slate 800 (Premium Contrast)
                    fontWeight: 500,  
                    fontFamily: "'Outfit', sans-serif",
                    borderBottom: '1px solid #f1f5f9',
                    fontSize: '0.9rem',
                }
            },
        },
        RaDatagrid: {
            styleOverrides: {
                root: {
                    '& .RaDatagrid-headerCell': {
                        backgroundColor: '#f1f5f9',
                    },
                    '& .RaDatagrid-rowCell': {
                        color: 'inherit',
                    }
                }
            }
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: '8px',
                        transition: 'box-shadow 0.2s',
                        '&:hover fieldset': {
                            borderColor: '#94a3b8',
                        },
                        '&.Mui-focused fieldset': {
                            borderColor: '#4338ca',
                            borderWidth: '2px',
                        },
                    },
                }
            }
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    borderRight: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                }
            }
        }
    },
};
