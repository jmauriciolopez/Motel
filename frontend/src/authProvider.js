import { http } from './shared/api/HttpClient';

const normalizeRole = (role) => {
    if (!role) return 'Recepcionista';
    const upperRole = role.toUpperCase();
    const map = {
        'SUPERADMIN': 'SuperAdmin',
        'ADMINISTRADOR': 'Administrador',
        'SUPERVISOR': 'Supervisor',
        'RECEPCIONISTA': 'Recepcionista'
    };
    return map[upperRole] || role;
};

const login = async ({ username, password }) => {
    try {
        // NestJS endpoint for login (Spanish path)
        const response = await http.post('/autenticacion/login', { identificador: username, password });
        const { token, usuario } = response;

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(usuario));
        if (usuario.id) localStorage.setItem('userId', String(usuario.id));
        localStorage.setItem('fullName', usuario.Username || usuario.username || usuario.Email || usuario.email);
        localStorage.setItem('email', usuario.Email || usuario.email);
        localStorage.setItem('role', normalizeRole(usuario.Rol || usuario.rol || 'RECEPCIONISTA'));

        // Normalizar estructura de moteles — backend devuelve { motelId, nombre: motel.nombre }
        const motelesNormalizados = (usuario.moteles || []).map(m => ({
            id: m.motelId || m.id,
            nombre: m.nombre || m.Nombre,
            OnboardingCompleto: m.OnboardingCompleto,
        }));
        localStorage.setItem('moteles', JSON.stringify(motelesNormalizados));

        if (motelesNormalizados.length > 0) {
            localStorage.setItem('motelId', motelesNormalizados[0].id);
        }

        // Forzar recarga para reinicializar contextos (MotelProvider, etc.)
        window.location.href = window.location.origin + window.location.pathname;
        return Promise.resolve();
    } catch (error) {
        throw new Error(error.message || 'Credenciales inválidas');
    }
};

const register = async (params) => {
    const { username, email, password } = params;
    try {
        const response = await http.post('/autenticacion/registro', { username, email, password });
        const { token, usuario } = response;

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(usuario));
        if (usuario.id) localStorage.setItem('userId', String(usuario.id));
        localStorage.setItem('email', usuario.Email || usuario.email);
        localStorage.setItem('fullName', usuario.Username || usuario.username || usuario.Email || usuario.email);
        localStorage.setItem('role', normalizeRole(usuario.Rol || usuario.rol || 'ADMINISTRADOR'));

        return Promise.resolve();
    } catch (error) {
        throw new Error(error.message || 'Error en el registro');
    }
};

const logout = () => {
    localStorage.clear();
    sessionStorage.clear();
    return Promise.resolve();
};

const checkAuth = () => {
    return localStorage.getItem('token') ? Promise.resolve() : Promise.reject();
};

const checkError = (error) => {
    const status = error.status;
    if (status === 401 || status === 403) {
        // En NestJS 401 es No Auth, 403 es Forbidden. 
        // Si es 401, forzamos logout.
        if (status === 401) {
            logout();
            return Promise.reject();
        }
    }
    return Promise.resolve();
};

const getPermissions = () => {
    const role = localStorage.getItem('role');
    return role ? Promise.resolve(normalizeRole(role)) : Promise.reject();
};

const getIdentity = () => {
    const fullName = localStorage.getItem('fullName');
    const email = localStorage.getItem('email');
    if (!fullName && !email) return Promise.reject();
    return Promise.resolve({
        id: email,
        fullName: fullName || email,
        avatar: undefined,
    });
};

const authProvider = {
    login,
    register,
    logout,
    checkAuth,
    checkError,
    getPermissions,
    getIdentity,
};

export default authProvider;
