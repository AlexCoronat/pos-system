# Sistema POS Multi-Tenant SaaS

**Fecha de Actualizacion**: 21 de Noviembre de 2025
**Version del Proyecto**: 2.5.0
**Estado**: En Desarrollo Activo - 92% Completado

---

## Resumen General

### Stack Tecnologico

```
Frontend:  Next.js 14 + shadcn/ui + Tailwind CSS
Backend:   Supabase (PostgreSQL + Auth + RLS)
Estado:    TypeScript + Zustand
Charts:    Recharts
UI:        54 componentes shadcn/ui instalados
Arquitectura: Multi-tenant con RLS (Row Level Security)
```

### Progreso del Proyecto

```
██████████████████████████████ 92% COMPLETADO

✅ Completado:   8 modulos principales + arquitectura multi-tenant
🔄 En Progreso:  0 modulos
❌ Pendiente:    2 modulos (Reportes, Proveedores)
```

---

## Estado Actual de Modulos

### Completados (90%)

| Modulo | Estado | Archivos Principales |
|--------|--------|---------------------|
| **Autenticacion Multi-tenant** | 100% | `lib/services/auth.service.ts` |
| **Registro con Negocio** | 100% | `app/auth/register/page.tsx`, `app/auth/complete-profile/page.tsx` |
| **Gestion de Equipo** | 100% | `lib/services/team.service.ts`, `app/dashboard/settings/team/` |
| **Gestion de Roles** | 100% | `lib/services/roles.service.ts`, `app/dashboard/settings/roles/` |
| **Ventas** | 95% | `lib/services/sales.service.ts` |
| **Dashboard** | 90% | `app/dashboard/page.tsx` |
| **Inventario/Productos** | 90% | `lib/services/product.service.ts`, `inventory.service.ts` |
| **Clientes** | 95% | `lib/services/customer.service.ts` |
| **Configuracion/Ubicaciones** | 95% | `lib/services/location.service.ts` |

### Pendientes (10%)

| Modulo | Prioridad | Descripcion |
|--------|-----------|-------------|
| **Reportes** | Media | Graficos, exportacion PDF/Excel |
| **Proveedores/Compras** | Baja | Ordenes de compra |
| **Planes/Suscripciones** | Baja | Integracion de pagos, upgrade de planes |

---

## Funcionalidades Implementadas

### 1. Autenticacion Multi-tenant (100%)

- Login con email/password
- Google OAuth
- Registro de usuarios con creacion de negocio
- Flujo de completar perfil (negocio + ubicacion)
- Recuperacion de contraseña
- Cambio de contraseña
- Gestion de sesiones activas
- Sistema de permisos (RBAC)
- Multiples ubicaciones por usuario
- Tracking de IP y User Agent
- Aislamiento de datos por business_id

**Paginas:**
- `/auth/login`
- `/auth/register`
- `/auth/recover-password`
- `/auth/reset-password`
- `/auth/verify-email`
- `/auth/complete-profile` - Crea negocio y ubicacion inicial
- `/auth/callback`

### 2. Gestion de Equipo (100%)

- Lista de miembros del equipo
- Invitar nuevos usuarios por email
- Asignar roles (sistema o personalizados)
- Asignar ubicaciones
- Activar/desactivar usuarios
- Eliminar usuarios del equipo
- Visualizacion del propietario del negocio

**Paginas:**
- `/dashboard/settings/team` - Lista del equipo (incluye invitacion y asignacion de roles/ubicaciones)

### 3. Gestion de Roles (100%)

- Roles del sistema (Admin, Manager, Cashier, Inventory)
- Crear roles personalizados
- Editor visual de permisos por modulo
- Duplicar roles existentes
- Editar/eliminar roles personalizados
- Proteccion de roles del sistema

**Matriz de Permisos:**
| Modulo | Acciones |
|--------|----------|
| Dashboard | ver |
| Productos | ver, crear, editar, eliminar |
| Inventario | ver, crear, editar, eliminar |
| Ventas | ver, crear, editar, eliminar, cancelar |
| Clientes | ver, crear, editar, eliminar |
| Reportes | ver, exportar |
| Configuracion | ver, editar |
| Usuarios | ver, crear, editar, eliminar |

**Paginas:**
- `/dashboard/settings/roles` - Lista de roles (incluye creacion y edicion mediante dialogos)

### 4. Ventas (95%)

- Busqueda de productos con inventario
- Carrito de compra (Zustand store)
- Calculo de descuentos e impuestos (IVA 16%)
- Multiples metodos de pago (Efectivo, Tarjeta, Transferencia, Mercado Pago)
- Creacion de ventas con reduccion automatica de inventario
- Cancelacion con restauracion de inventario
- Sistema de reembolsos
- Generacion de numeros de venta
- Filtros por fecha, estado, cliente
- Paginacion

**Paginas:**
- `/dashboard/sales` - Lista de ventas
- `/dashboard/sales/new` - Nueva venta (POS)
- `/dashboard/sales/[id]` - Detalle de venta

**Pendiente:**
- Generacion de PDF/recibo

### 5. Dashboard (90%)

- Resumen de ventas del dia
- Conteo de transacciones
- Alertas de bajo stock
- Cotizaciones pendientes
- Grafico de ventas (7 dias)
- Productos mas vendidos
- Indicadores de cambio porcentual
- Saludo por hora del dia

**Paginas:**
- `/dashboard` - Dashboard principal
- `/dashboard/sessions` - Gestion de sesiones

### 6. Inventario/Productos (90%)

- Lista de productos con filtros
- Crear nuevo producto
- Editar producto existente
- Eliminar producto (soft delete)
- Ajustar inventario (entrada/salida/ajuste)
- Transferencias entre ubicaciones
- Alertas de stock bajo
- Historial de movimientos
- Niveles de stock por ubicacion

**Paginas:**
- `/dashboard/inventory` - Lista con tabs (Productos, Stock, Alertas)
- `/dashboard/inventory/products/new` - Crear producto
- `/dashboard/inventory/products/[id]` - Ver/editar producto

### 7. Clientes (95%)

- Lista de clientes con filtros y paginacion
- Busqueda por nombre, email, telefono
- Crear nuevo cliente (individual/empresa)
- Editar cliente existente
- Eliminar cliente (soft delete)
- Historial de compras por cliente
- Estadisticas del cliente (total gastado, ticket promedio)
- Sistema de puntos de lealtad
- Limite de credito y saldo actual
- Verificacion de email duplicado

**Paginas:**
- `/dashboard/customers` - Lista de clientes
- `/dashboard/customers/new` - Crear cliente
- `/dashboard/customers/[id]` - Ver/editar cliente

**Pendiente:**
- Exportacion de clientes a Excel/CSV

### 8. Configuracion (95%)

- Pagina principal de configuracion
- CRUD de ubicaciones/sucursales
- Gestion de equipo completa
- Gestion de roles y permisos
- Asignacion de usuarios a ubicaciones

**Paginas:**
- `/dashboard/settings` - Menu principal de configuracion
- `/dashboard/settings/locations` - Gestion de ubicaciones
- `/dashboard/settings/team` - Gestion del equipo
- `/dashboard/settings/roles` - Gestion de roles

**Pendiente:**
- Configuracion de empresa (logo, datos fiscales)
- Metodos de pago personalizados
- Notificaciones

---

## Estructura del Proyecto

```
nextjs_space/
├── app/
│   ├── auth/                    # Paginas de autenticacion
│   │   ├── login/
│   │   ├── register/
│   │   └── complete-profile/    # Crear negocio inicial
│   └── dashboard/
│       ├── page.tsx             # Dashboard principal
│       ├── sales/               # Modulo de ventas
│       ├── inventory/           # Modulo de inventario
│       ├── customers/           # Modulo de clientes
│       ├── settings/
│       │   ├── team/            # Gestion de equipo y usuarios
│       │   ├── roles/           # Gestion de roles
│       │   └── locations/       # Gestion de ubicaciones
│       ├── access-denied/       # Pagina de acceso denegado
│       └── sessions/            # Gestion de sesiones
├── components/
│   ├── layout/
│   │   └── DashboardLayout.tsx  # Layout principal
│   ├── sales/                   # Componentes de ventas
│   ├── inventory/               # Componentes de inventario
│   └── ui/                      # Componentes shadcn/ui
├── lib/
│   ├── services/
│   │   ├── auth.service.ts      # Servicio de autenticacion
│   │   ├── sales.service.ts     # Servicio de ventas
│   │   ├── product.service.ts   # Servicio de productos
│   │   ├── inventory.service.ts # Servicio de inventario
│   │   ├── customer.service.ts  # Servicio de clientes
│   │   ├── location.service.ts  # Servicio de ubicaciones
│   │   ├── team.service.ts      # Servicio de equipo
│   │   └── roles.service.ts     # Servicio de roles
│   ├── stores/
│   │   └── cart-store.ts        # Estado del carrito (Zustand)
│   ├── hooks/
│   │   └── use-auth.ts          # Hook de autenticacion
│   ├── types/                   # Definiciones TypeScript
│   └── supabase/                # Configuracion Supabase
└── supabase/
    ├── migrations/              # Migraciones SQL
    └── sql/                     # Scripts de produccion
        ├── 001_production_setup.sql
        ├── 002_functions_triggers_rls.sql
        ├── 003_seed_data.sql
        └── README.md
```

---

## Base de Datos (Supabase)

### Arquitectura Multi-tenant

El sistema utiliza **base de datos compartida con RLS** (Row Level Security):
- Cada negocio tiene un `business_id` unico
- Los datos se filtran automaticamente por `business_id`
- Las politicas RLS garantizan aislamiento de datos

### Tablas Principales

| Tabla | Descripcion |
|-------|-------------|
| `subscription_plans` | Planes de suscripcion (Free, Starter, Professional, Enterprise) |
| `businesses` | Negocios/empresas (tenants del sistema) |
| `roles` | Roles unificados (sistema + personalizados por negocio) |
| `locations` | Ubicaciones/sucursales por negocio |
| `user_details` | Perfiles de usuario vinculados a auth.users |
| `user_locations` | Asignacion de usuarios a ubicaciones |
| `user_sessions` | Sesiones activas para auditoria |
| `categories` | Categorias de productos por negocio |
| `products` | Catalogo de productos con precios |
| `inventory` | Stock por producto y ubicacion |
| `inventory_movements` | Historial de movimientos de inventario |
| `customers` | Clientes por negocio |
| `sales` | Ventas realizadas |
| `sale_items` | Items de cada venta |
| `payment_methods` | Metodos de pago disponibles |
| `payment_transactions` | Transacciones de pago |

### Funciones Helper

| Funcion | Descripcion |
|---------|-------------|
| `get_user_business_id()` | Retorna el business_id del usuario autenticado |
| `check_plan_limit()` | Verifica limites del plan (usuarios, ubicaciones, productos) |
| `handle_new_user()` | Crea perfil en user_details al registrar usuario |
| `auto_assign_business_id()` | Asigna business_id automaticamente en inserts |

### Vistas Materializadas

| Vista | Descripcion |
|-------|-------------|
| `mv_daily_sales_by_location` | Ventas diarias por ubicacion |
| `mv_top_selling_products` | Productos mas vendidos (30 dias) |

---

## Roles y Permisos

### Roles del Sistema (No editables)

| Rol | Descripcion | Permisos Principales |
|-----|-------------|---------------------|
| **Admin** | Administrador con acceso completo | Todos los modulos y acciones |
| **Manager** | Gerente con acceso a reportes | Ventas, Inventario, Clientes, Reportes, Configuracion (solo ver) |
| **Cashier** | Cajero con acceso a ventas | Dashboard, Ventas (ver/crear), Clientes (ver/crear) |
| **Inventory** | Encargado de inventario | Dashboard, Productos, Inventario, Reportes (ver) |

### Roles Personalizados

- Cada negocio puede crear roles personalizados
- Se identifican con `is_system = false` y `business_id` asignado
- Permisos configurables por modulo y accion

---

## Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Build
npm run build

# Linting
npm run lint
```

---

## Variables de Entorno

Crear archivo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

---

## Arquitectura Multi-Tenant (COMPLETADA)

### Objetivo
Sistema POS SaaS donde multiples negocios operan de forma independiente con aislamiento completo de datos mediante Row Level Security.

---

### Fases Completadas

| Fase | Descripcion | Estado |
|------|-------------|--------|
| 1 | Migracion BD + RLS + Tablas multi-tenant | ✅ Completado |
| 2 | Flujo de registro con negocio | ✅ Completado |
| 3 | Gestion de usuarios del equipo | ✅ Completado |
| 4 | Gestion de roles personalizados | ✅ Completado |
| 5 | Actualizacion de todos los servicios | ✅ Completado |

### Trabajo Pendiente

| Tarea | Prioridad | Descripcion |
|-------|-----------|-------------|
| Planes/Suscripciones | Media | Integracion de pagos, pagina de billing |
| Reportes | Media | Graficos avanzados, exportacion PDF/Excel |
| Proveedores/Compras | Baja | CRUD de proveedores, ordenes de compra |

### Planes de Suscripcion Implementados

| Plan | Usuarios | Ubicaciones | Productos | Precio/mes |
|------|----------|-------------|-----------|------------|
| Free | 2 | 1 | 100 | $0 |
| Starter | 5 | 2 | 500 | $299 |
| Professional | 15 | 5 | 2,000 | $599 |
| Enterprise | Ilimitado | Ilimitado | Ilimitado | $1,299 |

### Scripts de Produccion

Ubicacion: `supabase/sql/`

```bash
# Ejecutar en orden en Supabase SQL Editor:
1. 001_production_setup.sql      # Tablas y estructura
2. 002_functions_triggers_rls.sql # Funciones, triggers, RLS
3. 003_seed_data.sql              # Datos iniciales
```

---

## Metricas del Proyecto

### Lineas de Codigo

```
Autenticacion:    ~700 lineas
Ventas:           ~560 lineas
Productos:        ~400 lineas
Inventario:       ~400 lineas
Clientes:         ~470 lineas
Ubicaciones:      ~350 lineas
Equipo:           ~400 lineas
Roles:            ~350 lineas
UI Components:    ~3,500 lineas
Paginas:          ~5,500 lineas
SQL Scripts:      ~750 lineas
Total actual:     ~13,400 lineas
```

### Tiempo Estimado Restante

```
Planes/Billing:   6-8 horas
Reportes:         12-15 horas
Proveedores:      12-15 horas
Testing:          15-20 horas
---
Total:            45-58 horas

A 4h/dia:         ~11-15 dias
A 8h/dia:         ~6-7 dias
```

---

## Historial de Cambios

### v2.5.0 (21 Nov 2025)
- **Consolidacion del modulo de Usuarios y Equipo**
- Eliminada pagina separada de usuarios (`/settings/users`)
- Mejorada pagina de equipo con funcionalidad completa de gestion de usuarios
- Mejorado servicio de roles con mejor manejo de errores y validaciones
- Mejorado servicio de ubicaciones
- Actualizado middleware de autenticacion
- Mejorado servicio de autenticacion con funcionalidades adicionales
- Gestion de roles ahora mediante dialogos en la pagina principal
- Pagina de acceso denegado actualizada

### v2.4.0 (20 Nov 2025)
- **Arquitectura Multi-Tenant completada**
- Consolidacion de tablas roles y custom_roles en tabla unificada
- Gestion completa de equipo (invitar, asignar roles, ubicaciones)
- Gestion de roles personalizados con editor visual de permisos
- Scripts SQL de produccion para despliegue
- Funciones helper: get_user_business_id(), check_plan_limit()
- Triggers para auto-asignacion de business_id
- Politicas RLS para todas las tablas
- Datos iniciales (planes, roles del sistema, metodos de pago)
- Corregidos errores de UI en pagina de roles

### v2.3.0 (20 Nov 2025)
- Implementado modulo de Configuracion
- CRUD de ubicaciones/sucursales
- Asignacion de usuarios a ubicaciones
- Establecer ubicacion principal por usuario
- Validacion de ubicaciones con usuarios asignados
- Corregido error de columna sales.total (ahora total_amount)

### v2.2.0 (19 Nov 2025)
- Implementado modulo completo de Clientes
- CRUD de clientes (individual y empresa)
- Historial de compras por cliente
- Estadisticas del cliente (total gastado, ticket promedio, puntos)
- Validacion de email duplicado
- Tabs para informacion, historial y estadisticas

### v2.1.0 (19 Nov 2025)
- Implementado modulo completo de Inventario/Productos
- Corregido servicio de productos para usar estructura correcta de BD
- Agregado dialogo de ajuste de stock
- Mejorado manejo de errores en middleware

### v2.0.0 (17 Nov 2025)
- Implementado modulo de Ventas completo
- Dashboard con estadisticas
- Gestion de sesiones

### v1.0.0 (Inicial)
- Infraestructura base
- Sistema de autenticacion completo
- Configuracion de Supabase

---

## Plan de Internacionalización (i18n)

### Objetivo
Implementar soporte completo de múltiples idiomas usando `next-intl`, con español como idioma por defecto y soporte para inglés. El cambio de idioma debe aplicarse globalmente al modificar la preferencia en la página de perfil.

### Biblioteca Seleccionada
**next-intl** - Optimizada para Next.js 14 App Router, con soporte para Server y Client Components.

### Idiomas a Implementar
- 🇪🇸 **Español** (es) - Por defecto
- 🇺🇸 **Inglés** (en)

---

### Fase 1: Setup e Infraestructura ⚙️
**Tiempo estimado:** 2-3 horas

**Tareas:**
- [*] Instalar `next-intl`
- [*] Crear estructura de carpetas para traducciones
  ```
  messages/
  ├── es.json          # Español (default)
  └── en.json          # Inglés
  ```
- [*] Configurar `i18n.ts` (configuración base)
- [*] Crear `middleware.ts` para detección de idioma
- [*] Envolver app con `NextIntlClientProvider`
- [*] Configurar español como idioma por defecto
- [*] Crear hook personalizado `useTranslations`

**Archivos a crear/modificar:**
- `messages/es.json`
- `messages/en.json`
- `lib/i18n/config.ts`
- `middleware.ts`
- `app/layout.tsx`

---

### Fase 2: Componentes de Layout y Navegación 🎨
**Tiempo estimado:** 3-4 horas

**Componentes a traducir:**
- [*] **DashboardLayout** (`components/layout/DashboardLayout.tsx`)
  - Sidebar: Dashboard, Sales, Inventory, Customers, Quotes, Reports
  - User menu: Profile, Active Sessions, Admin Settings, Sign out
  - Logo y branding
- [*] **Navegación mobile**
- [*] **Top bar** (selector de ubicación, notificaciones)

**Archivos de traducción:**
```json
{
  "layout": {
    "appName": "Sistema POS",
    "navigation": {
      "dashboard": "Dashboard / Panel",
      "sales": "Ventas / Sales",
      "inventory": "Inventario / Inventory",
      ...
    }
  }
}
```

---

### Fase 3: Autenticación 🔐
**Tiempo estimado:** 3-4 horas

**Páginas a traducir:**
- [*] **Login** (`app/auth/login/page.tsx`)
  - Formulario, mensajes de error, links
- [*] **Register** (`app/auth/register/page.tsx`)
  - Formulario de registro, validaciones
- [*] **Complete Profile** (`app/auth/complete-profile/page.tsx`)
  - Creación de negocio y ubicación
- [*] **Password Recovery** (`app/auth/recover-password/page.tsx`)
- [*] **Reset Password** (`app/auth/reset-password/page.tsx`)
- [*] **Email Verification** (`app/auth/verify-email/page.tsx`)

**Archivos de traducción:**
```json
{
  "auth": {
    "login": {
      "title": "Iniciar Sesión / Sign In",
      "email": "Correo electrónico / Email",
      ...
    }
  }
}
```

---

### Fase 4: Páginas de Perfil y Configuración 👤
**Tiempo estimado:** 2-3 horas

**Páginas a traducir:**
- [*] **Profile** (`app/dashboard/profile/page.tsx`)
  - Información personal
  - Información del negocio (admin only)
  - Seguridad
  - Preferencias (con selector de idioma funcional)
  - Detalles de cuenta
- [*] **Active Sessions** (`app/dashboard/sessions/page.tsx`)
  - Tabs: My Sessions / Team Sessions
  - Lista de sesiones
  - Botones de acción
  - Security Notice
- [*] **Settings** (`app/dashboard/settings/page.tsx`)
  - Títulos de secciones
  - Descripciones

**Integración con selector de idioma:**
- Conectar el selector de idioma en Profile con next-intl
- Actualizar cookies/localStorage
- Aplicar cambio globalmente

---

### Fase 5: Dashboard Principal 📊 ✅
**Tiempo estimado:** 2-3 horas

**Componentes a traducir:**
- [*] **Dashboard Home** (`app/dashboard/page.tsx`)
  - Saludo por hora del día
  - Cards de métricas (Ventas del día, Transacciones, etc.)
  - Gráfico de ventas
  - Productos más vendidos
  - Alertas de bajo stock

---

### Fase 6: Módulo de Ventas 💰 ✅
**Tiempo estimado:** 4-5 horas

**Páginas a traducir:**
- [*] **Sales List** (`app/dashboard/sales/page.tsx`)
  - Tabla, filtros, estados
- [*] **New Sale / POS** (`app/dashboard/sales/new/page.tsx`)
  - Búsqueda de productos
  - Carrito
  - Checkout
  - Métodos de pago
- [*] **Sale Detail** (`app/dashboard/sales/[id]/page.tsx`)
  - Detalles de la venta
  - Items, totales
  - Acciones (cancelar, reembolsar)

---

### Fase 7: Módulo de Inventario 📦 ✅
**Tiempo estimado:** 4-5 horas

**Páginas a traducir:**
- [*] **Inventory List** (`app/dashboard/inventory/page.tsx`)
  - Tabs: Productos, Stock, Alertas
  - Tabla de productos
  - Filtros y búsqueda
- [*] **Product Form** (`app/dashboard/inventory/products/new/page.tsx`)
  - Formulario de producto
  - Categorías, precios
- [*] **Product Detail** (`app/dashboard/inventory/products/[id]/page.tsx`)
  - Información del producto
  - Ajustes de inventario
  - Historial de movimientos

---

###  Fase 8: Módulo de Clientes 👥 ✅
**Tiempo estimado:** 3-4 horas

**Páginas a traducir:**
- [*] **Customers List** (`app/dashboard/customers/page.tsx`)
  - Tabla, filtros
- [*] **Customer Form** (`app/dashboard/customers/new/page.tsx`)
  - Formulario (individual/empresa)
- [ ] **Customer Detail** (`app/dashboard/customers/[id]/page.tsx`)
  - Información, historial, estadísticas
  - Tabs

---

### Fase 9: Módulo de Configuración ⚙️ ✅
**Tiempo estimado:** 4-5 horas

**Páginas a traducir:**
- [*] **Team Management** (`app/dashboard/settings/team/page.tsx`)
  - Lista de miembros
  - Invitaciones
  - Asignación de roles
- [*] **Roles & Permissions** (`app/dashboard/settings/roles/page.tsx`)
  - Lista de roles
  - Editor de permisos
  - Matriz de permisos por módulo
- [*] **Locations** (`app/dashboard/settings/locations/page.tsx`)
  - CRUD de ubicaciones

---

### Fase 10: Componentes Compartidos y Validaciones 🔧
**Tiempo estimado:** 3-4 horas

**Elementos a traducir:**
- [ ] **Componentes UI reutilizables**
  - Dialogs, Modals
  - Botones comunes (Guardar, Cancelar, Eliminar, etc.)
  - Confirmaciones
  - Toasts / Notificaciones
- [ ] **Mensajes de error y validación**
  - Validaciones de formularios
  - Errores de API
  - Mensajes de éxito
- [ ] **Tablas y paginación**
  - Headers
  - Empty states
  - Loading states
  - Paginación (Anterior, Siguiente, etc.)

---

### Fase 11: Formato de Fechas, Números y Moneda 💱
**Tiempo estimado:** 2-3 horas

**Tareas:**
- [ ] Configurar formato de fechas según idioma
  - `es`: DD/MM/YYYY
  - `en`: MM/DD/YYYY
- [ ] Configurar formato de números
  - `es`: 1.234,56
  - `en`: 1,234.56
- [ ] Configurar formato de moneda
  - Símbolo: $ (MXN)
  - Separadores según idioma
- [ ] Crear helpers de formateo
  - `formatDate()`
  - `formatCurrency()`
  - `formatNumber()`

---

### Fase 12: Testing y Ajustes Finales ✅
**Tiempo estimado:** 3-4 horas

**Tareas:**
- [ ] Probar cambio de idioma en todas las páginas
- [ ] Verificar persistencia del idioma seleccionado
- [ ] Revisar textos demasiado largos (overflow)
- [ ] Ajustar espaciado y layout según idioma
- [ ] Probar en mobile y desktop
- [ ] Documentar cómo agregar nuevas traducciones
- [ ] Crear guía para contribuidores

---

### Tiempo Total Estimado
**35-45 horas** (~1-1.5 semanas a tiempo completo)

### Priorización Recomendada
1. ✅ **Fase 1** (Setup) - Crítico, base para todo
2. ✅ **Fase 2** (Layout) - Alta, se ve en todas las páginas
3. ✅ **Fase 4** (Profile) - Alta, incluye selector de idioma funcional
4. ✅ **Fase 3** (Auth) - Media-Alta, primera impresión
5. ✅ **Fase 5** (Dashboard) - Media-Alta, página principal
6. ✅ **Fase 6** (Ventas) - Alta, funcionalidad core del negocio
7. ✅ **Fase 7** (Inventario) - Alta, gestión de productos
8. ⚡ **Fase 8-12** - Según prioridad de negocio

---

### Estructura de Archivos de Traducción

```json
// messages/es.json
{
  "common": {
    "loading": "Cargando...",
    "save": "Guardar",
    "cancel": "Cancelar",
    "delete": "Eliminar",
    "edit": "Editar",
    "search": "Buscar",
    "filter": "Filtrar",
    "actions": "Acciones"
  },
  "layout": { /* ... */ },
  "auth": { /* ... */ },
  "dashboard": { /* ... */ },
  "sales": { /* ... */ },
  "inventory": { /* ... */ },
  "customers": { /* ... */ },
  "settings": { /* ... */ },
  "errors": {
    "required": "Este campo es requerido",
    "invalidEmail": "Email inválido",
    "generic": "Ocurrió un error"
  }
}
```

---

## Contacto y Soporte

Para reportar issues o sugerencias, crear un issue en el repositorio.

---

*Actualizado el 24 de Noviembre de 2025*
