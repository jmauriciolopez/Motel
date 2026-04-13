import {
    DataProvider,
    GetListParams,
    GetOneParams,
    GetManyParams,
    GetManyReferenceParams,
    UpdateParams,
    UpdateManyParams,
    CreateParams,
    DeleteParams,
    DeleteManyParams
} from 'react-admin';
import { http } from './HttpClient';

/**
 * Data Provider for NestJS + Prisma backend.
 */
const resourceMap: Record<string, string> = {
    // Corrección de pluralización incorrecta (legacy frontend)
    'movilidads': 'movilidades',
    'tarifas': 'tarifas',
    'rubros': 'rubros',
    'productos': 'productos',
    'depositos': 'depositos',
    'gastos': 'gastos',
    'clientes': 'clientes',
    'habitaciones': 'habitaciones',
    'compras': 'compras',
    'consumos': 'consumos',
    'limpiezas': 'limpiezas',
    'mantenimientos': 'mantenimientos',
    'pagos': 'pagos',
    'turnos': 'turnos',
    'turnos-abrir': 'turnos/abrir',
    'insumodetalles': 'insumos/detalles',
    'propietarios': 'propietarios',
    'usuarios': 'usuarios',
    'reservas': 'reservas',
    'cajas': 'cajas',
    // Nombres especiales que difieren entre frontend y backend
    'stocks': 'stock',
    'formapagos': 'formas-pago',
};

// nestDataProvider.ts - el tenant activo viaja en x-motel-id desde HttpClient.
// No enviar motelId como query param ni como payload operativo.

const flattenFilters = (filter: any) => {
    const flattened: any = {};
    for (const key in filter) {
        if (filter[key] === undefined || filter[key] === null) continue;

        // Saltar parámetros especiales que se manejan aparte
        const lk = key.toLowerCase();
        if (key === 'include' || key === 'filtro' || key === 'OR' || key === 'AND' || key === '$or' || key === '$and') continue;
        // Saltar filtros fantasma de Strapi/RA
        if (lk === 'exist' || lk === 'existe' || lk.endsWith('_exist') || lk.endsWith('_existe')) continue;
        // motelId ya viene del token en el backend, no lo enviamos como query param
        if (lk === 'motelid') continue;
        // q es búsqueda de texto libre, se maneja via filtro JSON como OR en el backend
        if (key === 'q') continue;

        // Evitar [object Object] en la URL para operadores complejos ($lt, etc)
        if (typeof filter[key] === 'object') {
            continue;
        }

        // Los booleans pierden su tipo en query params (false → "false"),
        // se envían solo via el parámetro JSON 'filtro' que preserva el tipo
        if (typeof filter[key] === 'boolean') {
            continue;
        }

        // Mapeo de filtros anidados de RA/Strapi a IDs planos de NestJS
        if (key === 'motel.id' || key === 'habitacion.motel.id' || key === 'deposito.motel.id' ||
            key === 'turno.motel.id' || key === 'turno.habitacion.motel.id' ||
            key === 'habitacion.motelId' || key === 'deposito.motelId') {
            // ignorar — el backend filtra por token
        } else if (key === 'habitacion.id') {
            flattened['habitacionId'] = filter[key];
        } else if (key === 'deposito.id') {
            flattened['depositoId'] = filter[key];
        } else {
            flattened[key] = filter[key];
        }
    }
    return flattened;
};

/**
 * Convierte filtros especiales como 'existe' o booleanos en campos de fecha
 * a operadores que el backend y Prisma entiendan.
 */
const sanitizeFilter = (filter: any): any => {
    if (!filter || typeof filter !== 'object') return filter;
    
    if (Array.isArray(filter)) {
        return filter.map(item => sanitizeFilter(item));
    }

    if (filter instanceof Date) return filter;

    const sanitized: any = {};

    const FORBIDDEN_KEYS = ['existe', 'exist', 'populate', 'documentId'];

    for (const key in filter) {
        if (filter[key] === undefined || filter[key] === null) continue;

        const lowerKey = key.toLowerCase();

        // 1. Omitir parámetros legacy de Strapi que rompen Prisma
        if (FORBIDDEN_KEYS.includes(lowerKey)) {
            continue;
        }

        let value = filter[key];

        // 2. Manejar el sufijo _exist / _existe (mapear a nulidad)
        if (lowerKey.endsWith('_exist') || lowerKey.endsWith('_existe')) {
            const realKey = key.replace(/_exist$/i, '').replace(/_existe$/i, '');
            sanitized[realKey] = value === true ? { "$ne": null } : null;
            continue;
        }

        // 3. Si el valor es un objeto (y no es una fecha), sanitizar recursivamente
        if (typeof value === 'object' && !(value instanceof Date)) {
            // Caso especial: Operadores de Prisma ($or, $and)
            if (key === '$or' || key === '$and') {
                const prismaKey = key === '$or' ? 'OR' : 'AND';
                sanitized[prismaKey] = sanitizeFilter(value);
                continue;
            } 
            // Caso especial: Operador $null para campos nullable
            else if ('$null' in value) {
                if (value.$null === true) {
                    // $null: true → campo debe ser null
                    sanitized[key] = null;
                } else if (value.$null === false) {
                    // $null: false → campo NO debe ser null
                    sanitized[key] = { not: null };
                }
                continue;
            }
            // Caso especial: Operadores de comparación de Prisma - convertir de $ a prisma
            else if ('$gte' in value || '$lte' in value || '$gt' in value || '$lt' in value || '$ne' in value) {
                const converted: any = {};
                if ('$gte' in value) converted.gte = value.$gte;
                if ('$lte' in value) converted.lte = value.$lte;
                if ('$gt' in value) converted.gt = value.$gt;
                if ('$lt' in value) converted.lt = value.$lt;
                if ('$ne' in value) converted.not = value.$ne;
                sanitized[key] = converted;
                continue;
            }
            // Operadores de Prisma ya en formato correcto (not, gte, lte, etc) - mantener tal cual
            else if ('not' in value || 'gte' in value || 'lte' in value || 'gt' in value || 'lt' in value || 'contains' in value || 'startsWith' in value || 'endsWith' in value) {
                sanitized[key] = value;
                continue;
            }
            else {
                sanitized[key] = sanitizeFilter(value);
            }
            continue;
        }

        // 4. Booleanos reales (p. ej. EsPrincipal, Finalizada en JSON filtro)
        if (typeof value === 'boolean') {
            sanitized[key] = value;
            continue;
        }

        sanitized[key] = value;
    }

    return sanitized;
};

const stringifyFilter = (filter: any): string | undefined => {
    if (!filter || typeof filter !== 'object') return undefined;
    
    // Aplicar sanitización antes de convertir a JSON
    const cleanFilter = sanitizeFilter(filter);
    
    // Excluir del JSON los campos que flattenFilters ya mapeó como query params planos
const FLATTENED_KEYS = new Set([
        'motel.id', 'habitacion.motel.id', 'deposito.motel.id',
        'turno.motel.id', 'turno.habitacion.motel.id',
        'habitacion.motelId', 'deposito.motelId',
        'habitacion.id', 'deposito.id',
        'motelId',  // nunca va en el JSON filtro, el backend lo lee del token
    ]);
    const cleaned: any = {};
    for (const key in cleanFilter) {
        if (cleanFilter[key] === undefined || cleanFilter[key] === null) continue;
        if (FLATTENED_KEYS.has(key)) continue; // ya va como motelId/habitacionId/etc
        cleaned[key] = cleanFilter[key];
    }

    // Convertir `q` (búsqueda de texto libre de react-admin) en OR de Prisma
    if (cleaned.q && typeof cleaned.q === 'string' && cleaned.q.trim()) {
        const term = cleaned.q.trim();
        cleaned.OR = [
            { Nombre: { contains: term, mode: 'insensitive' } },
            { CriterioBusqueda: { contains: term, mode: 'insensitive' } },
        ];
        delete cleaned.q;
    }

    if (Object.keys(cleaned).length === 0) return undefined;
    try {
        return JSON.stringify(cleaned);
    } catch {
        return undefined;
    }
};

const getMappedResource = (resource: string) => resourceMap[resource] || resource;

/**
 * Para compradetalles, las operaciones van a /compras/:compraId/detalles/:id
 * El compraId viene en el filter (getList) o en el record (create/update/delete).
 */
const getCompraDetalleUrl = (compraId: string, detalleId?: string) => {
    const base = `/compras/${compraId}/detalles`;
    return detalleId ? `${base}/${detalleId}` : base;
};

const getInsumoDetalleUrl = (insumoId: string, detalleId?: string) => {
    const base = `/insumos/${insumoId}/detalles`;
    return detalleId ? `${base}/${detalleId}` : base;
};

const getChanges = (oldData: any, newData: any) => {
    if (!oldData) return newData;
    const changes: any = {};
    Object.keys(newData).forEach(key => {
        if (JSON.stringify(newData[key]) !== JSON.stringify(oldData[key])) {
            changes[key] = newData[key];
        }
    });
    return changes;
};

const sanitizePayload = (data: any) => {
    if (!data || typeof data !== 'object') return data;
    const sanitized = { ...data };
    const systemFields = ['id', 'createdAt', 'updatedAt', 'deletedAt', '__v', 'propietario'];
    systemFields.forEach(field => delete sanitized[field]);
    Object.keys(sanitized).forEach(key => {
        const val = sanitized[key];
        if (val && typeof val === 'object' && !(val instanceof Date) && 'id' in val) {
            // Objeto relacional: motel: { id: "x" } → motelId: "x", delete motel
            sanitized[`${key}Id`] = val.id;
            delete sanitized[key];
        } else if (val && typeof val === 'object' && !(val instanceof Date)) {
            delete sanitized[key];
        }
    });
    return sanitized;
};

export const nestDataProvider: DataProvider = {
    getList: async (resource, params: GetListParams) => {
        const { page, perPage } = params.pagination;
        const { field, order } = params.sort;
        
        // Sanitizar filtros antes de procesar
        const sanitizedFilter = sanitizeFilter(params.filter || {});
        const { include, ...filter } = sanitizedFilter;

        // compradetalles / insumodetalles: se obtienen embebidos en el padre
        if (resource === 'compradetalles') {
            const compraId = filter.compraId;
            const response = await http.get<{ data: any[], total: number }>('/compras', {
                params: { _page: page, _limit: 1, filtro: compraId ? JSON.stringify({ id: compraId }) : undefined },
            });
            const compra = response.data?.[0];
            const detalles = compra?.detalles ?? [];
            return { data: detalles, total: detalles.length };
        }
        if (resource === 'insumodetalles') {
            const insumoId = filter.insumoId;
            const response = await http.get<{ data: any[], total: number }>('/insumos', {
                params: { _page: page, _limit: 1, filtro: insumoId ? JSON.stringify({ id: insumoId }) : undefined },
            });
            const insumo = response.data?.[0];
            const detalles = insumo?.detalles ?? [];
            return { data: detalles, total: detalles.length };
        }
        
        const metaInclude = params.meta?.include;

        const finalInclude = metaInclude || include;
        const mappedResource = getMappedResource(resource);

        const query: any = {
            _page: page,
            _limit: perPage,
            _sort: field,
            _order: order,
            ...flattenFilters(filter),
            filtro: stringifyFilter(filter),
        };

        if (finalInclude) {
            query.include = typeof finalInclude === 'object' ? JSON.stringify(finalInclude) : finalInclude;
        }

        const response = await http.get<{ data: any[], total: number }>(`/${mappedResource}`, { params: query });

        return {
            data: response.data || [],
            total: response.total || 0,
        };
    },

    getOne: async (resource, params: GetOneParams) => {
        const mappedResource = getMappedResource(resource);
        const { include, filtro } = params.meta || {};
        
        const query: any = {};
        if (include) query.include = typeof include === 'object' ? JSON.stringify(include) : include;
        if (filtro) query.filtro = typeof filtro === 'object' ? JSON.stringify(filtro) : filtro;

        const response = await http.get<any>(`/${mappedResource}/${params.id}`, { params: query });
        return { data: response };
    },

    getMany: async (resource, params: GetManyParams) => {
        const mappedResource = getMappedResource(resource);
        
        // Para obtener múltiples registros por ID, usamos el operador $in
        // Esto asegura que el backend/Prisma lo procese correctamente.
        const query = {
            id: { "$in": params.ids }
        };

        const response = await http.get<{ data: any[] }>(`/${mappedResource}`, { 
            params: { filtro: JSON.stringify(query) } 
        });

        return { data: response.data || [] };
    },

    getManyReference: async (resource, params: GetManyReferenceParams) => {
        const { page, perPage } = params.pagination;
        const { field, order } = params.sort;
        
        // Sanitizar filtros antes de procesar
        const sanitizedFilter = sanitizeFilter(params.filter || {});
        const { include, ...filter } = sanitizedFilter;
        
        const metaInclude = params.meta?.include;

        const finalInclude = metaInclude || include;
        const mappedResource = getMappedResource(resource);

        const query: any = {
            [params.target]: params.id,
            _page: page,
            _limit: perPage,
            _sort: field,
            _order: order,
            ...flattenFilters(filter),
            filtro: stringifyFilter(filter),
        };

        if (finalInclude) {
            query.include = typeof finalInclude === 'object' ? JSON.stringify(finalInclude) : finalInclude;
        }

        const response = await http.get<{ data: any[], total: number }>(`/${mappedResource}`, { params: query });
        return {
            data: response.data || [],
            total: response.total || 0,
        };
    },

    update: async (resource, params: UpdateParams) => {
        const mappedResource = getMappedResource(resource);
        const changes = getChanges(params.previousData, params.data);
        const data = sanitizePayload(changes);

        if (resource === 'compradetalles') {
            const compraId = params.data.compraId ?? params.previousData?.compraId;
            if (!compraId) throw new Error('compraId requerido para actualizar un detalle de compra');
            const response = await http.patch<any>(getCompraDetalleUrl(compraId, params.id as string), data);
            return { data: { ...response, compraId } };
        }
        if (resource === 'insumodetalles') {
            const insumoId = params.data.insumoId ?? params.previousData?.insumoId;
            if (!insumoId) throw new Error('insumoId requerido para actualizar un detalle de insumo');
            const response = await http.patch<any>(getInsumoDetalleUrl(insumoId, params.id as string), data);
            return { data: { ...response, insumoId } };
        }

        const response = await http.patch<any>(`/${mappedResource}/${params.id}`, data);
        return { data: response };
    },

    updateMany: async (resource, params: UpdateManyParams) => {
        const mappedResource = getMappedResource(resource);
        const data = sanitizePayload(params.data);
        const responses = await Promise.all(
            params.ids.map(id => http.patch<any>(`/${mappedResource}/${id}`, data))
        );
        return { data: responses.map(r => r.id) };
    },

    create: async (resource, params: CreateParams) => {
        const mappedResource = getMappedResource(resource);
        const data = sanitizePayload(params.data);

        if (resource === 'compradetalles') {
            const compraId = params.data.compraId;
            if (!compraId) throw new Error('compraId requerido para crear un detalle de compra');
            const response = await http.post<any>(getCompraDetalleUrl(compraId), data);
            return { data: { ...response, compraId } };
        }
        if (resource === 'insumodetalles') {
            const insumoId = params.data.insumoId;
            if (!insumoId) throw new Error('insumoId requerido para crear un detalle de insumo');
            const response = await http.post<any>(getInsumoDetalleUrl(insumoId), data);
            return { data: { ...response, insumoId } };
        }

        const response = await http.post<any>(`/${mappedResource}`, data);
        return { data: response };
    },

    delete: async (resource, params: DeleteParams) => {
        const mappedResource = getMappedResource(resource);

        if (resource === 'compradetalles') {
            const compraId = (params as any).previousData?.compraId ?? (params.meta as any)?.compraId;
            if (!compraId) throw new Error('compraId requerido para eliminar un detalle de compra');
            const response = await http.delete<any>(getCompraDetalleUrl(compraId, params.id as string));
            return { data: response };
        }
        if (resource === 'insumodetalles') {
            const insumoId = (params as any).previousData?.insumoId ?? (params.meta as any)?.insumoId;
            if (!insumoId) throw new Error('insumoId requerido para eliminar un detalle de insumo');
            const response = await http.delete<any>(getInsumoDetalleUrl(insumoId, params.id as string));
            return { data: response };
        }

        const response = await http.delete<any>(`/${mappedResource}/${params.id}`);
        return { data: response };
    },

    deleteMany: async (resource, params: DeleteManyParams) => {
        const mappedResource = getMappedResource(resource);
        const responses = await Promise.all(
            params.ids.map(id => http.delete<any>(`/${mappedResource}/${id}`))
        );
        return { data: responses.map(r => r.id) };
    },
};
