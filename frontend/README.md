# MotelFront 2025 - React Admin + Strapi 5

Este proyecto es una interfaz administrativa construida con React Admin, optimizada para trabajar con Strapi 5.

## 🚀 Inicio Rápido

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Configurar variables de entorno**:
   Crea/edita el archivo `.env` en la raíz:
   ```env
   VITE_APP_URL_STRAPI=http://localhost:1337/api
   ```

3. **Ejecutar en desarrollo**:
   ```bash
   npm run dev
   ```

## 🛠️ Data Provider Genérico (`ra-strapi-rest.js`)

El corazón de la comunicación con el backend es el provider localizado en `src/ra-strapi-rest.js`. Ha sido refactorizado para ser **100% genérico**, permitiendo su uso en múltiples proyectos sin modificar su código interno.

### Configuración en `App.js`

Toda la lógica específica del proyecto se inyecta mediante un objeto de configuración:

```javascript
const strapiConfig = {
  searchFieldsMapping: {
    turnos: ["id", "Nombre"],
    default: ["Nombre"],
  },
  populateFields: {
    turnos: "populate[habitacion]=true&populate[cliente]=true",
    // ...
  },
  resourceFilters: {
    turnos: (filters) => {
        // Lógica personalizada de filtrado
        return filters;
    }
  },
  knownRelations: ['motel', 'habitacion', 'cliente'],
};

const dataProviderBase = raStrapiRest(apiUrl, httpClient, strapiConfig);
```

## 🧪 Pruebas (Dual-Test Suite)

Hemos implementado un sistema de pruebas dual utilizando **Vitest**.

### 1. Pruebas Unitarias (Mocks)
Prueban la lógica interna del provider (construcción de URLs, mapeo de filtros, aplanado de datos) sin necesidad de que el backend esté encendido.

```bash
npm run test:unit
```

### 2. Pruebas de Integración (Real Backend)
Prueban la conectividad y el "contrato" real contra tu instancia local de Strapi.

```bash
npm run test:int
```

### 3. Modo Observación (Watch)
```bash
npm run test
```

## 🔐 Matriz de Permisos y Roles

El sistema utiliza una estructura de permisos jerárquica para garantizar la integridad de los datos entre moteles.

| Módulo / Sección | Recepcionista | Supervisor | Administrador | SuperAdmin |
| :--- | :---: | :---: | :---: | :---: |
| **Operaciones Diarias** | ✅ | ✅ | ✅ | ✅ |
| **Finanzas y Cajas** | ❌ | ✅ | ✅ | ✅ |
| **Inventario y Compras** | ❌ | ✅ | ✅ | ✅ |
| **Configuración Local** | ❌ | ❌ | ✅ | ✅ |
| **Propietarios** | ❌ | ❌ | ❌ | ✅ |
| **Gestión Multi-Motel** | ❌ | ❌ | ❌ | ✅ |

> [!NOTE]
> El rol **Administrador** tiene acceso de edición "parcial" a su propio motel, estando bloqueados los campos de facturación y vigencia del servicio que son exclusivos del **SuperAdmin**.

## 🧹 Limpieza de Código

El proyecto ha sido limpiado de archivos temporales y logs de depuración. Se han preservado los archivos `.md` de documentación técnica y deuda técnica para referencia futura.

---
Mantenido por el equipo de desarrollo de Moteles.