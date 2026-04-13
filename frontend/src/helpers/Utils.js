import { fetchUtils } from 'react-admin';

/**
 * @deprecated Favor use of localStorage directly or via authProvider/MotelContext
 */
export const Cookies = {
    getCookie: (name) => {
        // Fallback a sessionStorage para facilitar la migración
        const key = name === 'motel' ? 'motelId' : name;
        return sessionStorage.getItem(key) || null;
    },

    setCookie: (name, value, _days) => {
        const key = name === 'motel' ? 'motelId' : name;
        sessionStorage.setItem(key, value);
    },

    deleteCookie: (name) => {
        const key = name === 'motel' ? 'motelId' : name;
        sessionStorage.removeItem(key);
    }
};

export const getApiUrl = (endpoint) => {
    // Usamos la nueva variable de entorno o fallback al puerto estándar de NestJS
    const baseUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_APP_URL_STRAPI || 'http://localhost:3000';
    let cleanBase = baseUrl.trim();
    
    // Eliminar barra final si existe
    if (cleanBase.endsWith('/')) cleanBase = cleanBase.slice(0, -1);
    
    // Asegurar que el endpoint empiece con /
    let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // Si el base URL NO tiene /api y el endpoint TAMPOCO tiene /api, inyectarlo
    // Esto es para compatibilidad con NestJS global prefix 'api'
    if (!cleanBase.toLowerCase().includes('/api') && !cleanEndpoint.toLowerCase().startsWith('/api')) {
        cleanEndpoint = `/api${cleanEndpoint}`;
    }
    
    return `${cleanBase}${cleanEndpoint}`;
};

/**
 * @deprecated Use the centralized 'http' from shared/api/HttpClient
 */
const httpClient = (url, options = {}) => {
    if (!options.headers) {
        options.headers = new Headers({ Accept: 'application/json' });
    }
    const token = Cookies.getCookie('token');
    if (token) {
        options.headers.set('Authorization', `Bearer ${token}`);
    }
    const motelId = sessionStorage.getItem('motelId') || Cookies.getCookie('motel');
    if (motelId) {
        options.headers.set('x-motel-id', motelId);
    }
    return fetchUtils.fetchJson(url, options);
}

const utils = {
    httpClient,
    getApiUrl,
    Cookies
};

export default utils;
