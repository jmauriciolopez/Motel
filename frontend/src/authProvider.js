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

const saveSession = (usuario) => {
    sessionStorage.setItem('user', JSON.stringify(usuario));
    if (usuario.id) sessionStorage.setItem('userId', String(usuario.id));
    sessionStorage.setItem('fullName', usuario.Username || usuario.username || usuario.Email || usuario.email);
    sessionStorage.setItem('email', usuario.Email || usuario.email);
    sessionStorage.setItem('role', normalizeRole(usuario.Rol || usuario.rol || 'RECEPCIONISTA'));

    const motelesNormalizados = (usuario.moteles || []).map(m => ({
        id: m.motelId || m.id,
        nombre: m.nombre || m.Nombre,
        OnboardingCompleto: m.OnboardingCompleto,
    }));
    sessionStorage.setItem('moteles', JSON.stringify(motelesNormalizados));

    if (motelesNormalizados.length > 0) {
        sessionStorage.setItem('motelId', motelesNormalizados[0].id);
    }
};

const login = async ({ username, password }) => {
    try {
        const response = await http.post('/autenticacion/login', { identificador: username, password });
        saveSession(response.usuario);
        // Forzar recarga para reinicializar contextos (MotelProvider, etc.)
        window.location.href = window.location.origin + window.location.pathname;
        return Promise.resolve();
    } catch (error) {
        // Lanzar objeto con message para que react-admin lo muestre directo sin pasar por i18n
        return Promise.reject({ message: error.message || 'Credenciales inválidas' });
    }
};

const register = async (params) => {
    const { username, email, password } = params;
    try {
        const response = await http.post('/autenticacion/registro', { username, email, password });
        saveSession(response.usuario);
        return Promise.resolve();
    } catch (error) {
        throw new Error(error.message || 'Error en el registro');
    }
};

const logout = async () => {
    try { await http.post('/autenticacion/logout'); } catch (_) {}
    sessionStorage.clear();
    return Promise.resolve();
};

const checkAuth = async () => {
    // Verificar contra el backend — la cookie HttpOnly se envía automáticamente
    try {
        await http.post('/autenticacion/refresh');
        return Promise.resolve();
    } catch {
        sessionStorage.clear();
        return Promise.reject();
    }
};

const checkError = (error) => {
    const status = error.status;
    if (status === 401) {
        logout();
        return Promise.reject();
    }
    return Promise.resolve();
};

const getPermissions = () => {
    const role = sessionStorage.getItem('role');
    return role ? Promise.resolve(normalizeRole(role)) : Promise.reject();
};

const getIdentity = () => {
    const fullName = sessionStorage.getItem('fullName');
    const email = sessionStorage.getItem('email');
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
