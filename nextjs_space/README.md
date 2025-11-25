# Sistema POS Multi-Tenant SaaS

**Fecha de Actualización**: 24 de Noviembre de 2025
**Versión del Proyecto**: 2.6.0
**Estado**: En Desarrollo Activo - 95% Completado

---

## Resumen General

### Stack Tecnológico

```
Frontend:  Next.js 14 + shadcn/ui + Tailwind CSS
Backend:   Supabase (PostgreSQL + Auth + RLS)
Estado:    TypeScript + Zustand
Charts:    Recharts
UI:        54 componentes shadcn/ui instalados
Arquitectura: Multi-tenant con RLS (Row Level Security)
i18n:      next-intl (Español/Inglés)
```

### Progreso del Proyecto

```
███████████████████████████████ 95% COMPLETADO

✅ Completado:   10 módulos principales + arquitectura multi-tenant + i18n
🔄 En Progreso:  1 módulo (Reportes básico)
❌ Pendiente:    2 módulos (Reportes avanzado, Proveedores)
```

---

## Estado Actual de Módulos

### Completados (100%)

| Módulo | Estado | Translation | Archivos Principales |
|--------|--------|-------------|---------------------|
| **Autenticación Multi-tenant** | 100% | ✅ ES/EN | `lib/services/auth.service.ts` |
| **Registro con Negocio** | 100% | ✅ ES/EN | `app/auth/register/page.tsx`, `app/auth/complete-profile/page.tsx` |
| **Gestión de Equipo** | 100% | ✅ ES/EN | `lib/services/team.service.ts`, `app/dashboard/settings/team/` |
| **Gestión de Roles** | 100% | ✅ ES/EN | `lib/services/roles.service.ts`, `app/dashboard/settings/roles/` |
| **Gestión de Ubicaciones** | 100% | ✅ ES/EN | `lib/services/location.service.ts`, `app/dashboard/settings/locations/` |
| **Perfil de Usuario** | 100% | ✅ ES/EN | `app/dashboard/profile/page.tsx` |
| **Gestión de Sesiones** | 100% | ✅ ES/EN | `app/dashboard/sessions/page.tsx` |
| **Dashboard** | 100% | ✅ ES/EN | `app/dashboard/page.tsx` |
| **Ventas** | 98% | ✅ ES/EN | `lib/services/sales.service.ts`, `app/dashboard/sales/` |
| **Inventario/Productos** | 100% | ✅ ES/EN | `lib/services/product.service.ts`, `app/dashboard/inventory/` |
| **Clientes** | 100% | ✅ ES/EN | `lib/services/customer.service.ts`, `app/dashboard/customers/` |

### En Progreso (50-90%)

| Módulo | Estado | Translation | Descripción |
|--------|--------|-------------|-------------|
| **Reportes** | 50% | ❌ No | Service básico existe, falta UI completa y traducción |

### Pendientes (0-10%)

| Módulo | Prioridad | Descripción |
|--------|-----------|-------------|
| **Reportes Avanzados** | Media | Gráficos avanzados, exportación PDF/Excel |
| **Proveedores/Compras** | Baja | CRUD de proveedores, órdenes de compra |
| **Planes/Suscripciones** | Baja | UI de billing, integración de pagos |

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

### 4. Ventas (98%)

- Búsqueda de productos con inventario
- Carrito de compra (Zustand store)
- Cálculo de descuentos e impuestos (IVA 16%)
- Múltiples métodos de pago (Efectivo, Tarjeta, Transferencia, Mercado Pago)
- Creación de ventas con reducción automática de inventario
- Cancelación con restauración de inventario
- Sistema de reembolsos
- Generación de números de venta
- Filtros por fecha, estado, cliente
- Paginación
- **Translation Status:** ✅ Completamente traducido (ES/EN)

**Páginas:**
- `/dashboard/sales` - Lista de ventas
- `/dashboard/sales/new` - Nueva venta (POS)
- `/dashboard/sales/[id]` - Detalle de venta

**Pendiente:**
- Generación de PDF/recibo

### 5. Dashboard (100%)

- Resumen de ventas del día
- Conteo de transacciones
- Alertas de bajo stock
- Cotizaciones pendientes
- Gráfico de ventas (7 días)
- Productos más vendidos
- Indicadores de cambio porcentual
- Saludo por hora del día
- **Translation Status:** ✅ Completamente traducido (ES/EN)

**Páginas:**
- `/dashboard` - Dashboard principal
- `/dashboard/sessions` - Gestión de sesiones

### 6. Inventario/Productos (100%)

- Lista de productos con filtros
- Crear nuevo producto
- Editar producto existente
- Eliminar producto (soft delete)
- Ajustar inventario (entrada/salida/ajuste)
- Transferencias entre ubicaciones
- Alertas de stock bajo
- Historial de movimientos
- Niveles de stock por ubicación
- **Translation Status:** ✅ Completamente traducido (ES/EN)

**Páginas:**
- `/dashboard/inventory` - Lista con tabs (Productos, Stock, Alertas)
- `/dashboard/inventory/products/new` - Crear producto
- `/dashboard/inventory/products/[id]` - Ver/editar producto

### 7. Clientes (100%)

- Lista de clientes con filtros y paginación
- Búsqueda por nombre, email, teléfono
- Crear nuevo cliente (individual/empresa)
- Editar cliente existente
- Eliminar cliente (soft delete)
- Historial de compras por cliente
- Estadísticas del cliente (total gastado, ticket promedio)
- Sistema de puntos de lealtad
- Límite de crédito y saldo actual
- Verificación de email duplicado
- **Translation Status:** ✅ Completamente traducido (ES/EN)

**Páginas:**
- `/dashboard/customers` - Lista de clientes
- `/dashboard/customers/new` - Crear cliente
- `/dashboard/customers/[id]` - Ver/editar cliente

### 8. Configuración (100%)

- Página principal de configuración
- CRUD de ubicaciones/sucursales
- Gestión de equipo completa
- Gestión de roles y permisos
- Asignación de usuarios a ubicaciones
- **Translation Status:** ✅ Completamente traducido (ES/EN)

**Páginas:**
- `/dashboard/settings` - Menú principal de configuración
- `/dashboard/settings/locations` - Gestión de ubicaciones
- `/dashboard/settings/team` - Gestión del equipo
- `/dashboard/settings/roles` - Gestión de roles

**Pendiente:**
- Configuración de empresa (logo, datos fiscales)
- Métodos de pago personalizados
- Notificaciones

### 9. Perfil y Sesiones (100%)

**Perfil de Usuario:**
- Información personal
- Información del negocio (admin only)
- Seguridad (cambio de contraseña)
- Preferencias con **selector de idioma funcional**
- Detalles de cuenta
- **Translation Status:** ✅ Completamente traducido (ES/EN)

**Gestión de Sesiones:**
- Visualización de sesiones activas (propias y del equipo)
- Información de dispositivo, IP, ubicación
- Terminar sesiones individuales o todas
- Tracking de actividad
- **Translation Status:** ✅ Completamente traducido (ES/EN)

**Páginas:**
- `/dashboard/profile` - Perfil de usuario
- `/dashboard/sessions` - Gestión de sesiones

### 10. Reportes (50%)

- Service básico implementado (`reports.service.ts`)
- Página de reportes creada
- **Translation Status:** ❌ No traducido

**Páginas:**
- `/dashboard/reports` - Página de reportes (básica)

**Pendiente:**
- Gráficos avanzados
- Exportación PDF/Excel
- Más tipos de reportes
- Traducción completa

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

### v2.6.0 (24 Nov 2025)
- **Internacionalización (i18n) completada**
- Soporte completo para Español e Inglés (2,000+ claves de traducción)
- 10 módulos principales completamente traducidos
- Sistema de formateo automático (fechas, números, moneda)
- Selector de idioma funcional en perfil de usuario
- Utilidades de formateo (`lib/utils/formatters.ts`)
- Documentación completa para desarrolladores
- README actualizado con estado real del proyecto (95% completado)
- Módulos Profile y Sessions documentados
- Estado de traducción añadido a cada módulo

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

## Internacionalización (i18n)

✅ **Proyecto completado** - Sistema completamente bilingüe

### Resumen

- **Idiomas soportados:** Español (predeterminado) y Inglés
- **Claves de traducción:** 2,000+ en cada idioma
- **Módulos traducidos:** 10 de 10 módulos principales
- **Formateo automático:** Fechas, números y moneda según idioma
- **Selector de idioma:** Integrado en perfil de usuario

### Documentación

📚 **Guías para desarrolladores:**
- [Translation Guide](./docs/TRANSLATION_GUIDE.md) - Cómo agregar traducciones
- [Formatting Guide](./docs/FORMATTING_GUIDE.md) - Formateo de fechas/números/moneda
- [i18n Checklist](./docs/I18N_CHECKLIST.md) - Checklist para PRs

### Características Implementadas

✅ Cambio de idioma sin recargar página
✅ Persistencia de preferencia de idioma
✅ Formateo automático de fechas (DD/MM/YYYY vs MM/DD/YYYY)
✅ Formateo automático de números (1.234,56 vs 1,234.56)
✅ Formateo automático de moneda ($1.234,56 MXN)
✅ Tiempo relativo ("hace 2 horas" vs "2 hours ago")
✅ Traducciones compartidas reutilizables
✅ Sistema type-safe con TypeScript

### Tecnologías

- **Framework:** next-intl
- **Formateo:** Intl API nativo
- **Almacenamiento:** Cookies para persistencia

---

## Contacto y Soporte

Para reportar issues o sugerencias, crear un issue en el repositorio.

---

*Actualizado el 24 de Noviembre de 2025*
