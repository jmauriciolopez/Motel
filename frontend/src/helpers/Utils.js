import { fetchUtils } from 'react-admin';

/**
 * @deprecated Favor use of localStorage directly or via authProvider/MotelContext
 */
export const Cookies = {
    getCookie: (name) => {
        // Fallback a localStorage para facilitar la migración
        const localVal = localStorage.getItem(name === 'motel' ? 'motelId' : name);
        if (localVal) return localVal;

        const v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
        return v ? v[2] : null;
    },

    setCookie: (name, value, days) => {
        // También guardamos en localStorage para consistencia
        localStorage.setItem(name === 'motel' ? 'motelId' : name, value);
        
        var d = new Date();
        d.setTime(d.getTime() + 24 * 60 * 60 * 1000 * days);
        document.cookie = name + "=" + value + ";path=/;expires=" + d.toGMTString();
    },

    deleteCookie: (name) => {
        localStorage.removeItem(name === 'motel' ? 'motelId' : name);
        Cookies.setCookie(name, '', -1)
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
    const token = localStorage.getItem('token') || Cookies.getCookie('token');
    if (token) {
        options.headers.set('Authorization', `Bearer ${token}`);
    }
    const motelId = localStorage.getItem('motelId') || Cookies.getCookie('motel');
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
