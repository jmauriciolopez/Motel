// src/shared/api/HttpClient.ts

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface RequestOptions extends RequestInit {
    params?: Record<string, string | number | boolean | undefined>;
}

class HttpClient {
    private baseUrl: string;
    private onUnauthorized?: () => void;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    }

    setUnauthorizedCallback(callback: () => void) {
        this.onUnauthorized = callback;
    }

    private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const { params, ...customConfig } = options;

        // 1. URL Construction with Query Params
        const fullURL = `${this.baseUrl}/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
        const url = new URL(fullURL);
        
        if (params) {
            Object.keys(params).forEach(key => {
                if (params[key] !== undefined && params[key] !== 'all') {
                    url.searchParams.append(key, String(params[key]));
                }
            });
        }

        // 2. Headers Configuration
        const headers: Record<string, string> = {
            ...(customConfig.headers as Record<string, string> || {}),
        };

        // Inject Authorization header if token exists in localStorage
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Inject Motel ID header for data isolation
        const motelId = typeof window !== 'undefined' ? localStorage.getItem('motelId') : null;
        if (motelId) {
            headers['x-motel-id'] = motelId;
        }

        if (!(customConfig.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        const config: RequestInit = {
            ...customConfig,
            headers,
            credentials: 'include', // Necesario para enviar cookies HttpOnly
            cache: 'no-store',
        };

        // 3. Execution
        console.log(url.toString());
        const response = await fetch(url.toString(), config);

        // 4. Response Interceptor
        if (response.status === 401) {
            localStorage.removeItem('token');
            if (this.onUnauthorized) {
                this.onUnauthorized();
            }
            throw new Error('Sesión expirada');
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Error en la petición');
        }

        if (response.status === 204) return {} as T;

        const text = await response.text();
        return text ? JSON.parse(text) : ({} as T);
    }

    async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'GET' });
    }

    async post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
        return this.request<T>(endpoint, { 
            ...options, 
            method: 'POST', 
            body: body instanceof FormData ? body : JSON.stringify(body) 
        });
    }

    async put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
        return this.request<T>(endpoint, { 
            ...options, 
            method: 'PUT', 
            body: body instanceof FormData ? body : JSON.stringify(body) 
        });
    }

    async patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
        return this.request<T>(endpoint, { 
            ...options, 
            method: 'PATCH', 
            body: body instanceof FormData ? body : JSON.stringify(body) 
        });
    }

    async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'DELETE' });
    }
}

export const httpClient = new HttpClient(API_URL);
export const http = httpClient; // Alias for backward compatibility during refactor
