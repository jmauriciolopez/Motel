# Dead Code Analysis Report - Moteles Project

I have performed a symbol-level cross-reference analysis across the entire `Moteles` monorepo. I scanned **320 files** and cross-referenced the global symbol index.

## Summary of Findings

I identified **182 potential dead code candidates**. The quantity is higher than in the previous project, suggesting a significant amount of deprecated or legacy component files that are still present in the directory structure but no longer imported.

## 🔴 High Confidence (Unused Components & Files)

### 💻 Frontend (apps/frontend) - Massive Unused Feature Files
Most of these files exist in `frontend/src/Operaciones/` but their main exported components are never imported in `App.jsx` or any other part of the application:
- **Cajas**: `CajaList`, `CajaBanner`, `AperturaDialog`, `CierreDialog` (`Operaciones/cajas.js`)
- **Clientes**: `ClienteList`, `ClienteCreate`, `ClienteStatusBanner` (`Operaciones/clientes.js`)
- **Consumos**: `ConsumoList` (`Operaciones/consumos.js`)
- **Gastos**: `GastoList`, `GastoListActions` (`Operaciones/gastos.js`)
- **Limpiezas**: `LimpiezaList`, `LimpiezaCreate` (`Operaciones/limpiezas.js`)
- **Mantenimientos**: `MantenimientoList`, `MantenimientoCreate` (`Operaciones/mantenimientos.js`)
- **Turnos V1/Old**: Many buttons like `CerrarTurnoButton`, `PagoButton`, and `DashboardButton` in `Operaciones/turnos.js` are not referenced. (The app likely moved to `TurnosV2`).

### 📦 Backend (apps/backend)
- **Utilities**: `toCamelCase`, `mergeDeep`, `buildNestedObject` (`backend/src/compartido/utilidades/filtro-prisma.util.ts`)
- **Logic**: `motelIdRequerido`, `calcularEstado`, `conEstado` (`backend/src/modulos/turnos/turnos.service.ts`)
- **Auth**: `extractFromCookieOrBearer` (`backend/src/modulos/autenticacion/estrategias/jwt.estrategia.ts`)

### 🛠️ Infrastructure (Terraform)
- `aws_s3_bucket.frontend` (`frontend/terraform/main.tf`) — *Symbol defined but no external references found in the Terraform configuration scope.*

## 🟡 Medium Confidence (Library / Partial Use)
- `ToastProvider` / `useToast` (`frontend/src/shared/context/ToastContext.tsx`) — Exported but not found in use. *Verify if a global context was intended but never wrapped around the App.*
- `lazyResource` (`frontend/src/App.jsx`) — Defined in the entry point but unused.

## 🟢 False Positives (Entry Points)
- `checkTables` (`backend/scratch/check-db.js`) — Run manually as a script.
- `@keyframes App-logo-spin` (`frontend/src/App.css`) — CSS animations.

---

## 📋 Full List of Candidates (182 items)
The full list has been saved to the root directory for your review.

| Symbol | File Path |
|-------|-----------|
| `CajaList` | `frontend/src/Operaciones/cajas.js` |
| `ClienteList` | `frontend/src/Operaciones/clientes.js` |
| `motelIdRequerido` | `backend/src/modulos/turnos/turnos.service.ts` |
| ... | ... (Full list in DEAD_CODE_REPORT.md) |

**Recommendation:** A large number of files in `frontend/src/Operaciones/` appear to be legacy. I can help you verify if they can be safely deleted or if they are intended for a future migration.
