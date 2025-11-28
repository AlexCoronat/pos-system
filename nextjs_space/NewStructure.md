# 🚀 Plan de Desarrollo - Sistema POS
## Interfaz Dual (Admin/Vendedor) + Funcionalidades Avanzadas

---

## 📋 ÍNDICE

1. [Resumen del Proyecto](#1-resumen-del-proyecto)
2. [Fase 0: Análisis y Preparación](#fase-0-análisis-y-preparación)
3. [Fase 1: Base de Datos](#fase-1-base-de-datos)
4. [Fase 2: Sistema de Roles y Permisos](#fase-2-sistema-de-roles-y-permisos)
5. [Fase 3: Infraestructura de Vistas Duales](#fase-3-infraestructura-de-vistas-duales)
6. [Fase 4: Vista Administrador](#fase-4-vista-administrador)
7. [Fase 5: Vista POS Vendedor](#fase-5-vista-pos-vendedor)
8. [Fase 6: Sistema de Turnos y Cajas](#fase-6-sistema-de-turnos-y-cajas)
9. [Fase 7: Atajos de Teclado](#fase-7-atajos-de-teclado)
10. [Fase 8: PWA y Modo Offline](#fase-8-pwa-y-modo-offline)
11. [Fase 9: Personalización y Temas](#fase-9-personalización-y-temas)
12. [Fase 10: Testing y Despliegue](#fase-10-testing-y-despliegue)

---

## 1. RESUMEN DEL PROYECTO

### Objetivo Principal
Crear un sistema POS con dos interfaces diferenciadas:
- **Vista Admin**: Dashboard completo con todas las funcionalidades administrativas
- **Vista Vendedor**: Interfaz simplificada y rápida enfocada únicamente en ventas

### Stack Tecnológico
- **Framework**: Next.js 14 (App Router)
- **Base de datos**: Supabase (PostgreSQL)
- **Estilos**: Tailwind CSS
- **State Management**: Zustand (recomendado) o Context API
- **UI Components**: shadcn/ui

### Entregables por Fase
Cada fase incluye:
- Objetivos claros
- Archivos a crear/modificar
- Instrucciones detalladas para Antigravity
- Criterios de aceptación

---

## FASE 0: ANÁLISIS Y PREPARACIÓN
**Duración estimada: 1-2 días**
**Prioridad: CRÍTICA - Hacer primero**

### Objetivo
Entender la estructura actual del proyecto y preparar el terreno para los cambios.

### Instrucciones para Antigravity

#### Paso 0.1: Explorar la estructura del proyecto
```
Lee y analiza la estructura completa del proyecto:
- Examina el directorio /app para entender el routing actual
- Examina el directorio /components para ver componentes existentes
- Examina el directorio /lib para ver utilidades, hooks y servicios
- Identifica cómo está configurada la autenticación con Supabase
- Identifica cómo se manejan los roles actualmente
```

#### Paso 0.2: Extraer esquema de base de datos
```
Necesito que me ayudes a extraer el esquema actual de la base de datos /supabase/sql/schema.sql.

```

#### Paso 0.3: Documentar hallazgos
```
Crea un archivo /docs/CURRENT_STRUCTURE.md que documente:
- Tablas existentes y sus campos principales
- Sistema de roles actual (cómo se define, dónde se almacena)
- Sistema de permisos actual
- Flujo de autenticación
- Componentes principales del dashboard actual
```

### Criterios de Aceptación Fase 0
- [ ] Tengo un mapa claro de la estructura de carpetas
- [ ] Tengo el esquema de base de datos documentado
- [ ] Entiendo cómo funciona el sistema de roles actual
- [ ] Tengo identificados los archivos clave a modificar

---

## FASE 1: BASE DE DATOS
**Duración estimada: 2-3 días**
**Prioridad: CRÍTICA**
**Dependencias: Fase 0 completada**

### Objetivo
Crear las nuevas tablas necesarias y modificar las existentes para soportar todas las funcionalidades.

### Nuevas Tablas a Crear

#### Tabla 1: user_preferences
**Propósito**: Almacenar preferencias individuales de cada usuario

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL PRIMARY KEY | Identificador único |
| user_id | UUID REFERENCES auth.users | Usuario al que pertenecen |
| business_id | BIGINT REFERENCES businesses | Negocio del usuario |
| default_view | VARCHAR(20) | Vista por defecto: 'auto', 'admin', 'seller' |
| sidebar_collapsed | BOOLEAN | Si el sidebar está colapsado |
| theme | VARCHAR(20) | Tema: 'light', 'dark', 'system' |
| accent_color | VARCHAR(7) | Color de acento en HEX |
| quick_products | JSONB | Array de IDs de productos de acceso rápido |
| keyboard_shortcuts | JSONB | Atajos personalizados |
| auto_print_receipt | BOOLEAN | Imprimir ticket automáticamente |
| sound_enabled | BOOLEAN | Sonidos habilitados |
| created_at | TIMESTAMPTZ | Fecha de creación |
| updated_at | TIMESTAMPTZ | Última actualización |

#### Tabla 2: cash_registers
**Propósito**: Definir las cajas registradoras por ubicación

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL PRIMARY KEY | Identificador único |
| business_id | BIGINT REFERENCES businesses | Negocio |
| location_id | BIGINT REFERENCES locations | Sucursal |
| name | VARCHAR(100) | Nombre de la caja |
| code | VARCHAR(20) | Código único (ej: CAJA-01) |
| is_active | BOOLEAN | Si está activa |
| is_main | BOOLEAN | Si es la caja principal |
| created_at | TIMESTAMPTZ | Fecha de creación |

#### Tabla 3: cash_register_shifts
**Propósito**: Registrar los turnos/sesiones de caja

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL PRIMARY KEY | Identificador único |
| cash_register_id | BIGINT REFERENCES cash_registers | Caja |
| user_id | UUID REFERENCES auth.users | Usuario que abrió |
| shift_number | VARCHAR(30) | Número de turno (CAJA-YYYYMMDD-001) |
| status | VARCHAR(20) | Estado: 'open', 'suspended', 'closed' |
| opening_amount | DECIMAL(12,2) | Monto de apertura |
| expected_amount | DECIMAL(12,2) | Monto esperado (calculado) |
| actual_amount | DECIMAL(12,2) | Monto real al cerrar |
| difference | DECIMAL(12,2) | Diferencia (sobrante/faltante) |
| opened_at | TIMESTAMPTZ | Fecha/hora de apertura |
| closed_at | TIMESTAMPTZ | Fecha/hora de cierre |
| opening_notes | TEXT | Notas de apertura |
| closing_notes | TEXT | Notas de cierre |
| summary | JSONB | Resumen del turno (ventas por método, etc.) |

#### Tabla 4: cash_register_movements
**Propósito**: Registrar todos los movimientos de dinero en caja

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL PRIMARY KEY | Identificador único |
| shift_id | BIGINT REFERENCES cash_register_shifts | Turno |
| user_id | UUID REFERENCES auth.users | Usuario |
| movement_type | VARCHAR(30) | Tipo: 'opening', 'sale', 'refund', 'deposit', 'withdrawal', 'closing' |
| amount | DECIMAL(12,2) | Monto |
| payment_method_id | BIGINT | Método de pago (si aplica) |
| sale_id | BIGINT | Venta relacionada (si aplica) |
| description | TEXT | Descripción |
| created_at | TIMESTAMPTZ | Fecha/hora |

#### Tabla 5: offline_sync_queue
**Propósito**: Cola para sincronizar operaciones hechas offline

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL PRIMARY KEY | Identificador único |
| user_id | UUID REFERENCES auth.users | Usuario |
| device_id | VARCHAR(100) | Identificador del dispositivo |
| operation_type | VARCHAR(50) | Tipo de operación |
| payload | JSONB | Datos de la operación |
| status | VARCHAR(20) | Estado: 'pending', 'processing', 'completed', 'failed' |
| attempts | INT | Intentos de sincronización |
| error_message | TEXT | Mensaje de error si falló |
| created_at | TIMESTAMPTZ | Creado |
| synced_at | TIMESTAMPTZ | Sincronizado |

#### Tabla 6: location_themes
**Propósito**: Personalización visual por sucursal

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL PRIMARY KEY | Identificador único |
| location_id | BIGINT REFERENCES locations | Sucursal |
| primary_color | VARCHAR(7) | Color primario HEX |
| secondary_color | VARCHAR(7) | Color secundario HEX |
| logo_url | TEXT | URL del logo |
| created_at | TIMESTAMPTZ | Fecha de creación |

### Modificaciones a Tablas Existentes

#### Tabla: sales (agregar campos)
- `shift_id` (BIGINT): Referencia al turno de caja
- `is_offline` (BOOLEAN): Si se creó offline
- `offline_id` (VARCHAR): ID temporal usado offline

#### Tabla: products (agregar campos)
- `sale_frequency` (INT): Contador de frecuencia de venta
- `is_favorite` (BOOLEAN): Si es producto favorito/destacado

#### Tabla: user_details (agregar campos si no existen)
- `preferred_view` (VARCHAR): Vista preferida
- `default_cash_register_id` (BIGINT): Caja asignada

### Instrucciones para Antigravity

```
TAREA: Crear migración de base de datos

1. Crea un archivo SQL con todas las instrucciones para crear las nuevas tablas
   descritas arriba. Asegúrate de:
   - Incluir todas las restricciones de foreign key
   - Incluir índices para campos que se consultarán frecuentemente
   - Incluir valores default apropiados
   - Habilitar Row Level Security (RLS) en todas las tablas

2. Crea las políticas RLS básicas:
   - Los usuarios solo pueden ver/editar datos de su propio business_id
   - Los usuarios solo pueden ver/editar sus propias preferencias

3. Crea una función para generar automáticamente el número de turno

4. Crea triggers para actualizar automáticamente los campos updated_at

5. Al final, incluye queries de verificación para confirmar que todo se creó bien

IMPORTANTE: 
- NO borres datos existentes
- Usa IF NOT EXISTS para evitar errores si se ejecuta múltiples veces
- Documenta cada sección con comentarios claros
```

### Criterios de Aceptación Fase 1
- [ ] Todas las tablas nuevas existen en Supabase
- [ ] Las modificaciones a tablas existentes están aplicadas
- [ ] RLS está habilitado y funcionando
- [ ] Los índices están creados
- [ ] Puedo insertar y consultar datos en las nuevas tablas

---

## FASE 2: SISTEMA DE ROLES Y PERMISOS
**Duración estimada: 2-3 días**
**Prioridad: ALTA**
**Dependencias: Fase 1 completada**

### Objetivo
Implementar un sistema robusto de roles y permisos que determine qué vista ve cada usuario y qué acciones puede realizar.

### Definición de Roles

| Rol | Vista por Defecto | Puede Cambiar Vista | Permisos Principales |
|-----|-------------------|---------------------|----------------------|
| Admin | admin | Sí | Todo |
| Manager | admin | Sí | Todo excepto configuración de empresa |
| Supervisor | admin | Sí | Ventas, inventario, reportes básicos |
| Seller/Vendedor | seller | No | Solo ventas y su historial |
| Cashier/Cajero | seller | No | Solo ventas y caja |

### Matriz de Permisos por Módulo

| Módulo | Admin | Manager | Supervisor | Seller | Cashier |
|--------|-------|---------|------------|--------|---------|
| Dashboard Admin | ✅ | ✅ | ✅ | ❌ | ❌ |
| Crear Ventas | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ver Todas las Ventas | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ver Mis Ventas | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cancelar Ventas | ✅ | ✅ | ✅ | ❌ | ❌ |
| Inventario Completo | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ver Stock | ✅ | ✅ | ✅ | ✅ | ✅ |
| Clientes | ✅ | ✅ | ✅ | ✅ | ❌ |
| Cotizaciones | ✅ | ✅ | ✅ | ✅ | ❌ |
| Reportes | ✅ | ✅ | ✅ | ❌ | ❌ |
| Config Empresa | ✅ | ❌ | ❌ | ❌ | ❌ |
| Config Usuarios | ✅ | ✅ | ❌ | ❌ | ❌ |
| Config Roles | ✅ | ❌ | ❌ | ❌ | ❌ |
| Abrir/Cerrar Caja | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ver Todos los Turnos | ✅ | ✅ | ✅ | ❌ | ❌ |
| Cambiar de Vista | ✅ | ✅ | ✅ | ❌ | ❌ |

### Instrucciones para Antigravity

```
TAREA PREVIA: Verificcar si el funcionamiento actual de los roles y permisos es el correcto.
1. Verifica que los roles y permisos esten bien implementados.
2. Verifica que los permisos se aplican correctamente.
3. Verifica que los roles se aplican correctamente.
4. Verifica que los permisos se aplican correctamente en la vista admin.
5. Verifica que los permisos se aplican correctamente en la vista seller.

Esta es la estructura de permisos actual (lo que se tiene en base de datos):

[{"idx":0,"id":1,"business_id":null,"name":"Admin","description":"Administrador con acceso total","permissions":"{\"roles\": [\"read\", \"create\", \"update\", \"delete\"], \"sales\": [\"read\", \"create\", \"update\", \"delete\", \"cancel\", \"refund\"], \"users\": [\"read\", \"create\", \"update\", \"delete\"], \"billing\": [\"read\", \"update\"], \"reports\": [\"read\", \"export\"], \"settings\": [\"read\", \"update\"], \"customers\": [\"read\", \"create\", \"update\", \"delete\"], \"inventory\": [\"read\", \"create\", \"update\", \"delete\", \"adjust\", \"transfer\"], \"locations\": [\"read\", \"create\", \"update\", \"delete\"]}","is_system":true,"is_active":true,"created_at":"2025-11-20 22:51:04.400273+00","updated_at":"2025-11-20 22:51:04.400273+00"},{"idx":1,"id":2,"business_id":null,"name":"Manager","description":"Gerente de sucursal","permissions":"{\"sales\": [\"read\", \"create\", \"update\", \"cancel\", \"refund\"], \"users\": [\"read\"], \"reports\": [\"read\", \"export\"], \"settings\": [\"read\"], \"customers\": [\"read\", \"create\", \"update\"], \"inventory\": [\"read\", \"create\", \"update\", \"adjust\"]}","is_system":true,"is_active":true,"created_at":"2025-11-20 22:51:04.400273+00","updated_at":"2025-11-20 22:51:04.400273+00"},{"idx":2,"id":3,"business_id":null,"name":"Seller","description":"Vendedor","permissions":"{\"sales\": [\"read\", \"create\", \"update\"], \"customers\": [\"read\", \"create\", \"update\"], \"inventory\": [\"read\"]}","is_system":true,"is_active":true,"created_at":"2025-11-20 22:51:04.400273+00","updated_at":"2025-11-20 22:51:04.400273+00"},{"idx":3,"id":4,"business_id":null,"name":"Inventory Manager","description":"Encargado de inventario","permissions":"{\"sales\": [\"read\"], \"reports\": [\"read\"], \"inventory\": [\"read\", \"create\", \"update\", \"delete\", \"adjust\", \"transfer\"]}","is_system":true,"is_active":true,"created_at":"2025-11-20 22:51:04.400273+00","updated_at":"2025-11-20 22:51:04.400273+00"},{"idx":4,"id":18,"business_id":null,"name":"Cashier","description":"Cajero con acceso a ventas","permissions":"{\"sales\": [\"view\", \"create\"], \"products\": [\"view\"], \"customers\": [\"view\", \"create\"], \"dashboard\": [\"view\"], \"inventory\": [\"view\"]}","is_system":true,"is_active":true,"created_at":"2025-11-21 03:53:17.30484+00","updated_at":"2025-11-21 03:53:17.30484+00"}]

TAREA: Implementar sistema de roles y permisos

PARTE A - Verificar/actualizar datos en base de datos:
1. Verifica que la tabla de roles tenga todos los roles necesarios
2. Verifica/crea la tabla role_permissions si no existe
3. Inserta los permisos para cada rol según la matriz de arriba

PARTE B - Crear hook de permisos:
Archivo: /lib/hooks/use-permissions.ts

Este hook debe:
- Obtener el rol del usuario actual desde el contexto de auth
- Proveer función hasPermission(permission: string) que retorna boolean
- Proveer función canAccessModule(module: string) que retorna boolean
- Proveer función canSwitchView() que retorna boolean
- Cachear los permisos para evitar consultas repetidas

PARTE C - Crear componente de protección:
Archivo: /components/auth/PermissionGate.tsx

Este componente debe:
- Recibir prop "permission" o "permissions" (array)
- Recibir prop "fallback" opcional (qué mostrar si no tiene permiso)
- Renderizar children solo si el usuario tiene el permiso
- Soportar lógica AND (todos los permisos) u OR (al menos uno)

PARTE D - Crear middleware de protección de rutas:
Archivo: /middleware.ts (modificar existente)

Debe verificar:
- Si el usuario está autenticado
- Si el usuario tiene permiso para acceder a la ruta solicitada
- Redirigir a la vista correcta según su rol si accede a ruta incorrecta

Ejemplo de uso:
- Usuario "Vendedor" intenta acceder a /dashboard/settings → redirigir a /pos
- Usuario "Admin" intenta acceder a /pos → permitir (puede cambiar vista)
```

### Criterios de Aceptación Fase 2
- [ ] Los roles están definidos en la base de datos
- [ ] El hook usePermissions funciona correctamente
- [ ] PermissionGate oculta elementos según permisos
- [ ] Las rutas están protegidas según el rol
- [ ] Un vendedor no puede acceder al dashboard admin
- [ ] Un admin puede acceder a ambas vistas

---

## FASE 3: INFRAESTRUCTURA DE VISTAS DUALES
**Duración estimada: 3-4 días**
**Prioridad: ALTA**
**Dependencias: Fase 2 completada**

### Objetivo
Crear la infraestructura base que permite alternar entre la vista de administrador y la vista de vendedor.

### Arquitectura de Vistas

```
/app
├── /dashboard          → Vista Admin (layout admin)
│   ├── page.tsx        → Dashboard principal admin
│   ├── /sales          → Módulo de ventas admin
│   ├── /inventory      → Módulo de inventario
│   ├── /customers      → Módulo de clientes
│   ├── /quotes         → Módulo de cotizaciones
│   ├── /reports        → Módulo de reportes
│   └── /settings       → Configuración
│
├── /pos                → Vista Vendedor (layout POS)
│   ├── page.tsx        → POS principal (crear venta)
│   ├── /history        → Mi historial de ventas
│   ├── /cash-register  → Mi caja/turno
│   └── /profile        → Mi perfil
│
└── layout.tsx          → Layout raíz con ViewProvider
```

### Instrucciones para Antigravity

```
TAREA: Crear infraestructura de vistas duales

PARTE A - Crear Store de Vista:
Archivo: /lib/stores/view-store.ts

Usar Zustand para manejar:
- currentView: 'admin' | 'seller' | 'auto'
- isTransitioning: boolean (para animaciones)
- sidebarCollapsed: boolean
- userRole: string
- canSwitchView: boolean

Funciones:
- setCurrentView(view): Cambiar vista con transición suave
- toggleView(): Alternar entre admin y seller
- getEffectiveView(): Resolver 'auto' al valor real según rol

PARTE B - Crear ViewProvider:
Archivo: /components/providers/ViewProvider.tsx

Este provider debe:
- Envolver la aplicación
- Cargar las preferencias del usuario al iniciar
- Configurar la vista inicial según rol y preferencias
- Escuchar cambios de autenticación

PARTE C - Crear Layout Admin:
Archivo: /app/dashboard/layout.tsx

Estructura:
- Sidebar completo a la izquierda (colapsable)
- Header superior con acciones rápidas
- Área de contenido principal
- Debe incluir el botón de cambio de vista

PARTE D - Crear Layout POS:
Archivo: /app/pos/layout.tsx

Estructura:
- Sidebar mínimo (solo iconos, ~64px de ancho)
- Sin header superior (maximizar espacio)
- Área de contenido ocupa todo el espacio restante
- Debe incluir botón de cambio de vista (si tiene permiso)

PARTE E - Crear componente ViewSwitcher:
Archivo: /components/shared/ViewSwitcher.tsx

Este botón debe:
- Mostrarse solo si el usuario puede cambiar de vista
- Mostrar el modo actual (Admin/Vendedor)
- Mostrar "Cambiar a [otro modo]" como subtexto
- Tener colores distintivos (violeta para admin, verde para vendedor)
- Al hacer clic, navegar a la otra vista con transición

PARTE F - Modificar Layout Raíz:
Archivo: /app/layout.tsx

Agregar el ViewProvider envolviendo el contenido
```

### Flujo de Navegación

1. **Usuario Admin accede a /dashboard**:
   - Ve el dashboard de administración completo
   - Ve botón "Cambiar a Vendedor" en el sidebar
   - Al hacer clic → navega a /pos

2. **Usuario Admin accede a /pos**:
   - Ve la interfaz POS simplificada
   - Ve botón "Cambiar a Admin" en el sidebar
   - Al hacer clic → navega a /dashboard

3. **Usuario Vendedor accede a cualquier ruta**:
   - Siempre es redirigido a /pos
   - NO ve botón de cambio de vista
   - NO puede acceder a /dashboard

### Criterios de Aceptación Fase 3
- [ ] El store de vista funciona correctamente
- [ ] El ViewProvider carga las preferencias
- [ ] El layout de admin se renderiza en /dashboard
- [ ] El layout de POS se renderiza en /pos
- [ ] El ViewSwitcher permite cambiar entre vistas
- [ ] La transición entre vistas es suave (animación)
- [ ] Los vendedores no ven el botón de cambio

---

## FASE 4: VISTA ADMINISTRADOR
**Duración estimada: 4-5 días**
**Prioridad: ALTA**
**Dependencias: Fase 3 completada**

### Objetivo
Implementar la vista completa de administrador basada en el prototipo diseñado.

### Componentes del Dashboard Admin

#### Sidebar Admin (264px ancho, colapsable a 80px)
Estructura de arriba a abajo:
1. **Logo**: "Sistema POS v2.0" con icono
2. **Selector de Ubicación**: Dropdown para cambiar sucursal
3. **Menú Principal**:
   - Panel (dashboard)
   - Ventas
   - Inventario (con badge de alertas)
   - Clientes
   - Cotizaciones (con badge de pendientes)
   - Reportes
4. **Configuración**:
   - Empresa
   - Equipo
   - Roles
5. **Botón Cambiar Vista**: Destacado con gradiente
6. **Perfil de Usuario**: Avatar, nombre, rol

#### Header Admin
- Saludo personalizado ("¡Buenas tardes, [Nombre]!")
- Subtítulo contextual
- Botón "Nueva Venta" prominente
- Iconos de notificaciones y configuración

#### Dashboard Principal
Organizado en grid responsive:

**Fila 1 - Tarjetas de Estadísticas (4 columnas)**:
1. Ventas del Día: Monto + porcentaje de cambio
2. Transacciones: Cantidad + porcentaje de cambio
3. Productos Bajo Stock: Cantidad con alerta
4. Cotizaciones Pendientes: Cantidad

**Fila 2 - Gráficos (2 columnas)**:
- Columna 1 (2/3): Gráfico de barras "Ventas Últimos 7 Días"
- Columna 2 (1/3): Lista "Productos Más Vendidos" con barras de progreso

**Fila 3 - Tablas (2 columnas)**:
- Columna 1: "Ventas Recientes" (tabla con últimas 5-10 ventas)
- Columna 2: "Alertas de Inventario" (productos con stock bajo)

### Instrucciones para Antigravity

```
TAREA: Implementar vista de administrador

PARTE A - Sidebar Admin:
Archivo: /components/admin/AdminSidebar.tsx

Requisitos:
- Ancho normal: 264px, colapsado: 80px
- Animación suave al colapsar/expandir
- Los items de nav muestran solo icono cuando está colapsado
- Tooltips en modo colapsado
- Indicador visual del item activo
- Badges para items con notificaciones
- El botón de colapsar está en el borde derecho del sidebar

PARTE B - Header Admin:
Archivo: /components/admin/AdminHeader.tsx

Requisitos:
- Sticky en la parte superior
- El saludo cambia según la hora (mañana/tarde/noche)
- Botón "Nueva Venta" lleva a /pos o abre modal de venta rápida
- Icono de notificaciones con indicador de no leídas
- Dropdown de configuración rápida

PARTE C - Tarjetas de Estadísticas:
Archivo: /components/admin/widgets/StatsCards.tsx

Requisitos:
- 4 tarjetas en fila (responsive: 2x2 en tablet, 1 columna en móvil)
- Cada tarjeta muestra: icono, título, valor principal, cambio porcentual
- Colores distintivos por tipo de métrica
- Los datos deben venir de un hook que consulta la API/BD

PARTE D - Gráfico de Ventas:
Archivo: /components/admin/widgets/SalesChart.tsx

Requisitos:
- Gráfico de barras con los últimos 7 días
- Selector para cambiar período (7 días, 30 días, este mes)
- Tooltips al hover mostrando el valor exacto
- Usar librería recharts (ya debería estar instalada)
- Los datos vienen de un hook

PARTE E - Productos Más Vendidos:
Archivo: /components/admin/widgets/TopProducts.tsx

Requisitos:
- Lista de los 5 productos más vendidos
- Cada item muestra: posición, nombre, cantidad, barra de progreso
- La barra de progreso es relativa al producto #1

PARTE F - Ventas Recientes:
Archivo: /components/admin/widgets/RecentSales.tsx

Requisitos:
- Tabla con las últimas 10 ventas
- Columnas: # Venta, Hora, Cliente, Total, Estado
- Estado con badge de color (completada=verde, pendiente=amarillo)
- Click en fila abre detalle de venta

PARTE G - Alertas de Inventario:
Archivo: /components/admin/widgets/LowStockAlert.tsx

Requisitos:
- Fondo de color de advertencia (naranja suave)
- Lista de productos con stock bajo
- Muestra: nombre, stock actual, stock mínimo
- Botón "Crear Orden de Compra" al final

PARTE H - Página Principal del Dashboard:
Archivo: /app/dashboard/page.tsx

Requisitos:
- Componer todos los widgets en el layout descrito
- Grid responsive usando Tailwind
- Loading states mientras cargan los datos
- Manejo de errores si falla alguna consulta
```

### Criterios de Aceptación Fase 4
- [ ] El sidebar se colapsa/expande correctamente
- [ ] La navegación funciona y muestra el item activo
- [ ] Las estadísticas muestran datos reales de la BD
- [ ] El gráfico de ventas se renderiza correctamente
- [ ] La lista de productos más vendidos funciona
- [ ] Las ventas recientes muestran datos reales
- [ ] Las alertas de inventario funcionan
- [ ] El layout es responsive
- [ ] El botón de cambio de vista funciona

---

## FASE 5: VISTA POS VENDEDOR
**Duración estimada: 5-6 días**
**Prioridad: ALTA**
**Dependencias: Fase 3 completada**

### Objetivo
Implementar la interfaz POS simplificada para vendedores, optimizada para velocidad y facilidad de uso.

### Diseño de la Interfaz POS

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [Sidebar 64px]  │              ÁREA PRINCIPAL                          │ CARRITO (396px) │
│                 │                                                       │                 │
│  [Logo]         │  ┌─────────────────────────────────────────────────┐ │  Venta Actual   │
│                 │  │  🔍 Buscar producto o escanear código... [F2]   │ │  [3 items]      │
│  [Ventas]●      │  └─────────────────────────────────────────────────┘ │                 │
│                 │                                                       │  [+ Cliente]    │
│  [Historial]    │  ACCESO RÁPIDO                                       │                 │
│                 │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                │  ───────────────│
│  [Caja]         │  │ 🥤   │ │ 🍟   │ │ 💧   │ │ 🍞   │                │                 │
│                 │  │Coca  │ │Sabri │ │Agua  │ │Pan   │                │  Coca-Cola      │
│  [Perfil]       │  │$18   │ │$22.5 │ │$15   │ │$45   │                │  2 x $18.00     │
│                 │  └──────┘ └──────┘ └──────┘ └──────┘                │                 │
│                 │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                │  Sabritas       │
│                 │  │ 🥛   │ │ 🥚   │ │ 🥓   │ │ 🧀   │                │  1 x $22.50     │
│                 │  │Leche │ │Huevos│ │Jamón │ │Queso │                │                 │
│  ─────────      │  │$28   │ │$52   │ │$38   │ │$65   │                │  Pan Bimbo      │
│                 │  └──────┘ └──────┘ └──────┘ └──────┘                │  1 x $45.00     │
│  [Cambiar       │                                                       │                 │
│   a Admin]      │  CATEGORÍAS                                          │  ───────────────│
│                 │  [Todos] [Bebidas] [Snacks] [Lácteos] [Panadería]   │                 │
│  ─────────      │                                                       │  Subtotal $103.5│
│                 │                                                       │  IVA 16%  $16.56│
│  [Salir]        │  ─────────────────────────────────────────────────── │  ═══════════════│
│                 │  F1 Ayuda │ F2 Buscar │ F8 Descuento │ F12 Cobrar   │  TOTAL   $120.06│
│                 │  Cajero: María García                                │                 │
│                 │                                                       │  [  COBRAR F12 ]│
│                 │                                                       │  [Pausar][Canc] │
└─────────────────────────────────────────────────────────────────────────┘
```

### Componentes del POS

#### Sidebar POS (64px fijo)
- Solo iconos, sin texto
- 4 opciones: Ventas, Historial, Caja, Perfil
- Botón de cambio de vista (si aplica)
- Botón de cerrar sesión

#### Área de Búsqueda
- Input grande y prominente
- Placeholder: "Buscar producto o escanear código de barras..."
- Auto-focus al cargar la página
- Atajo F2 para enfocar
- Búsqueda en tiempo real (debounced)
- Soporte para lector de código de barras

#### Productos de Acceso Rápido
- Grid de 8 productos más vendidos/favoritos
- Cada producto muestra: emoji/imagen, nombre corto, precio
- Click agrega al carrito inmediatamente
- Configurables por usuario

#### Categorías
- Tabs horizontales con scroll
- "Todos" siempre primero
- Filtrar productos por categoría seleccionada

#### Panel de Carrito (396px ancho fijo)
- Header: "Venta Actual" + badge con cantidad de items
- Botones: "+ Cliente", "Notas"
- Lista de items con:
  - Nombre del producto
  - Controles de cantidad (+/-)
  - Precio unitario x cantidad
  - Botón eliminar
- Sección de totales:
  - Subtotal
  - IVA (16%)
  - Total (grande, destacado)
- Botón COBRAR: Grande, verde, con atajo F12
- Botones secundarios: Pausar, Cancelar

#### Footer con Atajos
- Muestra los atajos de teclado principales
- Muestra nombre del cajero actual

### Instrucciones para Antigravity

```
TAREA: Implementar vista POS de vendedor

PARTE A - Store del Carrito:
Archivo: /lib/stores/cart-store.ts

Estado:
- items: array de productos en carrito
- customerId: cliente seleccionado (opcional)
- customerName: nombre del cliente
- subtotal: calculado automáticamente
- taxAmount: calculado (subtotal * 0.16)
- discountAmount: descuento aplicado
- total: subtotal + tax - discount
- notes: notas de la venta

Acciones:
- addItem(product): Agregar producto (si existe, incrementar cantidad)
- removeItem(itemId): Eliminar del carrito
- updateQuantity(itemId, quantity): Cambiar cantidad
- setCustomer(id, name): Asignar cliente
- applyDiscount(amount o percent): Aplicar descuento
- clearCart(): Vaciar carrito
- setNotes(text): Agregar notas

PARTE B - Sidebar POS:
Archivo: /components/pos/POSSidebar.tsx

Requisitos:
- Ancho fijo de 64px
- Fondo oscuro (gray-900)
- Solo iconos con tooltips
- 4 items de navegación + logout
- Mostrar ViewSwitcher si tiene permiso

PARTE C - Búsqueda de Productos:
Archivo: /components/pos/ProductSearch.tsx

Requisitos:
- Input grande con icono de búsqueda
- Mostrar atajo [F2] dentro del input
- Búsqueda debounced (300ms)
- Dropdown de resultados debajo del input
- Cada resultado muestra: nombre, SKU, precio, stock
- Click en resultado agrega al carrito
- Enter en resultado seleccionado agrega al carrito
- Soporte para código de barras (detectar input rápido)

PARTE D - Productos de Acceso Rápido:
Archivo: /components/pos/QuickProducts.tsx

Requisitos:
- Grid de 2 filas x 4 columnas
- Productos configurables (de user_preferences.quick_products)
- Si no hay configurados, mostrar los 8 más vendidos
- Cada tarjeta: emoji/icono, nombre, precio
- Efecto hover con borde verde y escala
- Click agrega al carrito

PARTE E - Categorías:
Archivo: /components/pos/CategoryTabs.tsx

Requisitos:
- Tabs horizontales con scroll horizontal si hay muchas
- "Todos" siempre visible y primero
- Click filtra productos en la búsqueda/grid
- Indicador visual de categoría activa

PARTE F - Panel de Carrito:
Archivo: /components/pos/CartPanel.tsx

Requisitos:
- Ancho fijo de 396px
- Scroll en la lista de items si hay muchos
- Sticky en la parte inferior: totales y botón cobrar
- Items con controles de cantidad inline
- Botón eliminar en cada item (icono de basura)
- Cálculos automáticos al cambiar items

PARTE G - Item del Carrito:
Archivo: /components/pos/CartItem.tsx

Requisitos:
- Nombre del producto (truncar si es muy largo)
- Precio unitario
- Controles +/- para cantidad
- Total de la línea
- Botón eliminar
- Swipe para eliminar (en móvil)

PARTE H - Modal de Pago:
Archivo: /components/pos/PaymentModal.tsx

Requisitos:
- Se abre al hacer clic en COBRAR
- Muestra resumen de la venta
- Selector de método de pago (efectivo, tarjeta, etc.)
- Si es efectivo: campo para monto recibido y cálculo de cambio
- Botón "Completar Venta"
- Al completar: registrar venta, limpiar carrito, mostrar confirmación

PARTE I - Indicador de Turno:
Archivo: /components/pos/ShiftIndicator.tsx

Requisitos:
- Muestra si hay turno abierto o no
- Si hay turno: muestra nombre de caja y hora de apertura
- Si no hay turno: muestra advertencia y botón para abrir

PARTE J - Página Principal POS:
Archivo: /app/pos/page.tsx

Requisitos:
- Verificar que hay turno abierto antes de permitir ventas
- Componer todos los componentes en el layout
- Manejar atajos de teclado globales
- Auto-focus en búsqueda al cargar
```

### Criterios de Aceptación Fase 5
- [ ] El sidebar minimalista funciona
- [ ] La búsqueda encuentra productos en tiempo real
- [ ] Los productos rápidos se muestran y funcionan
- [ ] Las categorías filtran correctamente
- [ ] El carrito suma y resta items correctamente
- [ ] Los totales se calculan bien (subtotal, IVA, total)
- [ ] El modal de pago funciona
- [ ] Se puede completar una venta exitosamente
- [ ] La venta se guarda en la base de datos
- [ ] El carrito se limpia después de una venta

---

## FASE 6: SISTEMA DE TURNOS Y CAJAS
**Duración estimada: 3-4 días**
**Prioridad: MEDIA**
**Dependencias: Fase 5 completada**

### Objetivo
Implementar el sistema de apertura/cierre de caja y gestión de turnos.

### Flujo de Turno

1. **Apertura de Caja**:
   - Usuario selecciona caja (si hay varias)
   - Ingresa monto inicial de apertura
   - Opcionalmente agrega notas
   - Sistema genera número de turno único
   - Se registra movimiento de apertura

2. **Durante el Turno**:
   - Todas las ventas se asocian al turno activo
   - Se pueden hacer depósitos (ingreso de efectivo)
   - Se pueden hacer retiros (salida de efectivo)
   - El monto esperado se actualiza automáticamente

3. **Cierre de Caja**:
   - Usuario indica que quiere cerrar
   - Sistema muestra resumen del turno:
     - Ventas por método de pago
     - Depósitos y retiros
     - Monto esperado en caja
   - Usuario ingresa monto real contado
   - Sistema calcula diferencia (sobrante/faltante)
   - Se genera reporte de cierre

### Instrucciones para Antigravity

```
TAREA: Implementar sistema de turnos y cajas

PARTE A - Store de Turno:
Archivo: /lib/stores/shift-store.ts

Estado:
- currentShift: turno activo o null
- currentCashRegister: caja actual
- isLoading: boolean
- error: string o null

Acciones:
- checkCurrentShift(): Verificar si hay turno abierto
- openShift(data): Abrir nuevo turno
- closeShift(data): Cerrar turno actual
- addMovement(data): Registrar movimiento (depósito/retiro)
- getShiftSummary(): Obtener resumen del turno

PARTE B - Servicio de Caja:
Archivo: /lib/services/cash-register.service.ts

Funciones:
- getCashRegisters(locationId): Obtener cajas de una ubicación
- getCurrentShift(cashRegisterId): Obtener turno activo de una caja
- openShift(data): Crear nuevo turno
- closeShift(shiftId, data): Cerrar turno
- createMovement(data): Crear movimiento
- getShiftMovements(shiftId): Obtener movimientos de un turno
- calculateShiftSummary(shiftId): Calcular resumen

PARTE C - Modal de Apertura de Caja:
Archivo: /components/pos/OpenShiftModal.tsx

Requisitos:
- Se muestra automáticamente si no hay turno al entrar a /pos
- Selector de caja (si hay más de una)
- Campo para monto de apertura (numérico)
- Campo opcional para notas
- Botón "Abrir Caja"
- Validación de monto (no negativo)

PARTE D - Modal de Cierre de Caja:
Archivo: /components/pos/CloseShiftModal.tsx

Requisitos:
- Muestra resumen del turno:
  - Monto de apertura
  - Total de ventas (desglosado por método de pago)
  - Total de depósitos
  - Total de retiros
  - Monto esperado (calculado)
- Campo para monto real contado
- Cálculo automático de diferencia
- Indicador visual si hay diferencia (rojo si faltante, verde si sobrante)
- Campo para notas de cierre
- Botón "Cerrar Caja"

PARTE E - Modal de Movimiento de Caja:
Archivo: /components/pos/CashMovementModal.tsx

Requisitos:
- Tipo de movimiento: Depósito o Retiro
- Campo de monto
- Campo de descripción/referencia
- Botón confirmar
- Actualiza el monto esperado

PARTE F - Página de Caja:
Archivo: /app/pos/cash-register/page.tsx

Requisitos:
- Muestra estado actual del turno
- Lista de movimientos del turno
- Botones para: Hacer depósito, Hacer retiro, Cerrar caja
- Resumen parcial actualizado en tiempo real

PARTE G - Integración con Ventas:
Modificar el flujo de ventas para:
- Verificar que hay turno abierto antes de permitir venta
- Asociar cada venta al shift_id activo
- Registrar movimiento de tipo 'sale' al completar venta
```

### Criterios de Aceptación Fase 6
- [ ] No se pueden hacer ventas sin turno abierto
- [ ] Se puede abrir turno con monto inicial
- [ ] Las ventas se asocian al turno correctamente
- [ ] Se pueden hacer depósitos y retiros
- [ ] El monto esperado se calcula correctamente
- [ ] Se puede cerrar turno con conteo real
- [ ] La diferencia se calcula y muestra correctamente
- [ ] El historial de movimientos funciona

---

## FASE 7: ATAJOS DE TECLADO
**Duración estimada: 2-3 días**
**Prioridad: MEDIA**
**Dependencias: Fase 5 completada**

### Objetivo
Implementar un sistema completo de atajos de teclado para uso rápido del POS.

### Atajos Predeterminados

| Atajo | Acción | Contexto |
|-------|--------|----------|
| F1 | Mostrar ayuda/atajos | Global |
| F2 | Enfocar búsqueda | POS |
| F3 | Nueva venta | Global |
| F4 | Agregar/buscar cliente | POS |
| F5 | Actualizar/recargar | Global |
| F6 | Ver historial de ventas | POS |
| F7 | Ver inventario rápido | POS |
| F8 | Aplicar descuento | POS (con items) |
| F9 | Pausar venta actual | POS (con items) |
| F10 | Abrir cajón de dinero | POS |
| F11 | Pantalla completa | Global |
| F12 | Cobrar / Finalizar venta | POS (con items) |
| Escape | Cancelar operación actual | Global |
| Ctrl+Z | Deshacer última acción | POS |
| + / - | Aumentar/disminuir cantidad | POS (item seleccionado) |
| Delete | Eliminar item seleccionado | POS (item seleccionado) |
| Enter | Confirmar/Seleccionar | Global |
| ↑ / ↓ | Navegar lista | Búsqueda, carrito |

### Instrucciones para Antigravity

```
TAREA: Implementar sistema de atajos de teclado

PARTE A - Hook de Atajos:
Archivo: /lib/hooks/use-keyboard-shortcuts.ts

Requisitos:
- Registrar listeners de teclado al montar
- Limpiar listeners al desmontar
- Cargar atajos personalizados del usuario (user_preferences)
- Combinar con atajos por defecto
- Prevenir comportamiento default del navegador donde sea necesario
- Manejar combinaciones (Ctrl+, Alt+, Shift+)

Funciones:
- registerShortcut(key, callback, options): Registrar un atajo
- unregisterShortcut(key): Eliminar atajo
- isShortcutEnabled(key): Verificar si está habilitado
- getShortcutKey(action): Obtener la tecla para una acción

PARTE B - Componente de Ayuda de Atajos:
Archivo: /components/shared/KeyboardShortcutsHelp.tsx

Requisitos:
- Modal que se abre con F1
- Lista de todos los atajos disponibles
- Agrupados por categoría (Navegación, Ventas, Edición)
- Búsqueda de atajos
- Indicador de atajos personalizados vs default

PARTE C - Footer de Atajos (POS):
Archivo: /components/pos/KeyboardHints.tsx

Requisitos:
- Barra en la parte inferior del POS
- Muestra los atajos más usados
- Formato: [Tecla] Acción
- Muestra nombre del cajero
- Se puede ocultar/mostrar

PARTE D - Configuración de Atajos:
Archivo: /components/settings/KeyboardShortcutsSettings.tsx

Requisitos:
- Lista de todas las acciones configurables
- Cada acción muestra atajo actual
- Click para cambiar atajo
- Detectar conflictos (mismo atajo para dos acciones)
- Botón para restaurar valores por defecto
- Guardar cambios en user_preferences

PARTE E - Integración en POS:
Modificar /app/pos/page.tsx para:
- Inicializar el hook de atajos
- Registrar todos los atajos del POS
- Conectar cada atajo con su acción correspondiente
```

### Criterios de Aceptación Fase 7
- [ ] F2 enfoca la búsqueda
- [ ] F12 abre el modal de cobro (si hay items)
- [ ] Escape cancela la operación actual
- [ ] F1 muestra la ayuda de atajos
- [ ] Los atajos se pueden personalizar
- [ ] Los atajos personalizados se guardan
- [ ] No hay conflictos con atajos del navegador
- [ ] El footer muestra los atajos principales

---

## FASE 8: PWA Y MODO OFFLINE
**Duración estimada: 4-5 días**
**Prioridad: MEDIA**
**Dependencias: Fases 5 y 6 completadas**

### Objetivo
Convertir la aplicación en PWA y permitir operación básica sin conexión.

### Funcionalidades Offline

| Funcionalidad | Offline | Sincronización |
|---------------|---------|----------------|
| Ver productos | ✅ (cacheados) | Automática |
| Crear venta | ✅ (cola local) | Al reconectar |
| Ver carrito | ✅ | N/A |
| Buscar productos | ✅ (local) | N/A |
| Ver historial | ⚠️ (solo local) | Al reconectar |
| Abrir/cerrar caja | ❌ | Requiere conexión |
| Sincronizar datos | ❌ | Requiere conexión |

### Instrucciones para Antigravity

```
TAREA: Implementar PWA y modo offline

PARTE A - Configurar PWA:
1. Instalar next-pwa: npm install next-pwa
2. Configurar en next.config.js
3. Crear manifest.json con:
   - Nombre: Sistema POS
   - Iconos en varios tamaños
   - Theme color: #10B981 (emerald)
   - Display: standalone
   - Start URL: /pos

PARTE B - Service Worker:
Archivo: /public/sw.js (generado por next-pwa)

Configurar estrategias de cache:
- Productos: Cache first, actualizar en background
- Imágenes: Cache first
- API calls: Network first, fallback a cache
- Assets estáticos: Cache first

PARTE C - Hook de Estado de Conexión:
Archivo: /lib/hooks/use-connection-status.ts

Estado:
- isOnline: boolean
- lastOnlineAt: Date
- pendingSyncCount: number
- syncInProgress: boolean

Funciones:
- checkConnection(): Verificar estado actual
- startSync(): Iniciar sincronización manual

PARTE D - Store de Sincronización:
Archivo: /lib/stores/offline-store.ts

Estado:
- pendingOperations: array de operaciones pendientes
- syncStatus: 'idle' | 'syncing' | 'error'
- lastSyncAt: Date

Funciones:
- queueOperation(operation): Agregar a cola
- processQueue(): Procesar cola pendiente
- clearQueue(): Limpiar cola (después de sync exitoso)

PARTE E - Servicio de Sincronización:
Archivo: /lib/services/sync.service.ts

Funciones:
- syncPendingOperations(): Enviar operaciones pendientes al servidor
- handleConflicts(): Resolver conflictos si los hay
- downloadLatestData(): Descargar datos actualizados

PARTE F - Indicador de Conexión:
Archivo: /components/shared/ConnectionIndicator.tsx

Requisitos:
- Icono que indica estado (online=verde, offline=rojo)
- Badge con número de operaciones pendientes
- Click muestra detalles y opción de sincronizar
- Animación cuando está sincronizando

PARTE G - Modificar flujo de ventas:
Cuando está offline:
1. La venta se guarda localmente (IndexedDB o localStorage)
2. Se agrega a la cola de sincronización
3. Se muestra indicador de "Venta guardada localmente"
4. Cuando vuelve la conexión, se sincroniza automáticamente

PARTE H - Cache de Productos:
1. Al cargar la app (online), cachear lista de productos
2. Guardar en IndexedDB para acceso rápido
3. La búsqueda busca en cache local primero
4. Actualizar cache periódicamente en background
```

### Criterios de Aceptación Fase 8
- [ ] La app se puede instalar como PWA
- [ ] El manifest.json está configurado correctamente
- [ ] Los productos se cachean para uso offline
- [ ] Se pueden crear ventas offline
- [ ] Las ventas offline se sincronizan al reconectar
- [ ] El indicador de conexión funciona
- [ ] La búsqueda funciona offline (con datos cacheados)
- [ ] No se pierde información al perder conexión

---

## FASE 9: PERSONALIZACIÓN Y TEMAS
**Duración estimada: 2-3 días**
**Prioridad: BAJA**
**Dependencias: Fases anteriores completadas**

### Objetivo
Permitir personalización visual de la aplicación por usuario y por ubicación.

### Opciones de Personalización

#### Por Usuario (user_preferences):
- Tema: claro / oscuro / sistema
- Color de acento
- Alto contraste (accesibilidad)
- Sidebar colapsado por defecto
- Vista por defecto

#### Por Ubicación (location_themes):
- Color primario de la marca
- Logo personalizado
- Color secundario

### Instrucciones para Antigravity

```
TAREA: Implementar personalización y temas

PARTE A - Provider de Tema:
Archivo: /components/providers/ThemeProvider.tsx

Requisitos:
- Detectar preferencia del sistema
- Aplicar tema según user_preferences
- Aplicar colores de ubicación si existen
- Generar variables CSS dinámicas para colores
- Persistir preferencia

PARTE B - Hook de Tema:
Archivo: /lib/hooks/use-theme.ts

Funciones:
- theme: 'light' | 'dark'
- setTheme(theme): Cambiar tema
- accentColor: string
- setAccentColor(color): Cambiar color de acento
- toggleHighContrast(): Alternar alto contraste

PARTE C - Variables CSS Dinámicas:
En globals.css o mediante JS:
- --color-primary: Color principal (emerald por defecto)
- --color-secondary: Color secundario
- --color-accent: Color de acento
- --color-background: Fondo
- --color-foreground: Texto
- Variantes para modo oscuro

PARTE D - Configuración de Apariencia:
Archivo: /components/settings/AppearanceSettings.tsx

Requisitos:
- Selector de tema (claro/oscuro/sistema)
- Selector de color de acento (paleta predefinida o custom)
- Toggle de alto contraste
- Preview en tiempo real
- Guardar cambios

PARTE E - Aplicar Tema de Ubicación:
Modificar componentes para:
- Usar variables CSS en lugar de colores hardcoded
- Cargar tema de ubicación al cambiar de sucursal
- Mostrar logo de ubicación si existe
```

### Criterios de Aceptación Fase 9
- [ ] Se puede cambiar entre tema claro y oscuro
- [ ] El tema persiste entre sesiones
- [ ] Los colores de acento se pueden personalizar
- [ ] El alto contraste funciona
- [ ] Los colores de ubicación se aplican
- [ ] El logo de ubicación se muestra

---

## FASE 10: TESTING Y DESPLIEGUE
**Duración estimada: 3-4 días**
**Prioridad: CRÍTICA**
**Dependencias: Todas las fases anteriores**

### Objetivo
Asegurar calidad y preparar para producción.

### Checklist de Testing

#### Funcionalidad Core:
- [ ] Login/logout funciona
- [ ] Cambio de vista admin/vendedor funciona
- [ ] Permisos se aplican correctamente
- [ ] CRUD de ventas funciona
- [ ] Carrito calcula correctamente
- [ ] Pagos se procesan bien
- [ ] Turnos de caja funcionan
- [ ] Atajos de teclado funcionan

#### Navegación:
- [ ] Todas las rutas cargan
- [ ] Redirecciones por rol funcionan
- [ ] Links del sidebar funcionan
- [ ] Breadcrumbs funcionan (si aplica)

#### Responsive:
- [ ] Desktop (1920px) se ve bien
- [ ] Laptop (1366px) se ve bien
- [ ] Tablet (768px) se ve bien
- [ ] Móvil (375px) se ve bien

#### Performance:
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] No memory leaks evidentes
- [ ] Las búsquedas son rápidas

#### Accesibilidad:
- [ ] Navegación por teclado funciona
- [ ] Screen readers pueden leer contenido
- [ ] Contraste suficiente
- [ ] Focus visible en elementos interactivos

### Instrucciones para Antigravity

```
TAREA: Testing y preparación para despliegue

PARTE A - Revisión de Errores:
1. Revisar consola del navegador por errores
2. Revisar logs del servidor
3. Corregir cualquier error encontrado

PARTE B - Optimización:
1. Verificar que las imágenes están optimizadas
2. Verificar que no hay imports innecesarios
3. Verificar que el bundle size es razonable
4. Implementar lazy loading donde sea apropiado

PARTE C - Variables de Entorno:
1. Crear archivo .env.example con todas las variables necesarias
2. Documentar cada variable
3. Verificar que no hay secrets en el código

PARTE D - Documentación:
Crear/actualizar README.md con:
- Descripción del proyecto
- Requisitos previos
- Instrucciones de instalación
- Variables de entorno necesarias
- Comandos disponibles
- Estructura del proyecto

PARTE E - Build de Producción:
1. Ejecutar npm run build
2. Verificar que no hay errores
3. Probar el build localmente con npm start
4. Verificar todas las funcionalidades en modo producción
```

### Criterios de Aceptación Fase 10
- [ ] No hay errores en consola
- [ ] El build de producción funciona
- [ ] La documentación está completa
- [ ] Las variables de entorno están documentadas
- [ ] El checklist de testing está completo
- [ ] Performance es aceptable

---

## 📝 NOTAS FINALES

### Para Antigravity - Cómo Usar Este Plan

1. **Sigue las fases en orden**: Cada fase depende de las anteriores
2. **Lee toda la fase antes de empezar**: Entiende el objetivo completo
3. **Pregunta si algo no está claro**: Es mejor preguntar que asumir
4. **Prueba después de cada parte**: No esperes al final de la fase
5. **Commitea frecuentemente**: Un commit por cada parte completada

### Convenciones de Código

- **Componentes**: PascalCase (ej: `CartPanel.tsx`)
- **Hooks**: camelCase con prefijo "use" (ej: `useCart.ts`)
- **Stores**: camelCase con sufijo "store" (ej: `cart-store.ts`)
- **Servicios**: camelCase con sufijo "service" (ej: `sales.service.ts`)
- **Tipos**: PascalCase (ej: `CartItem`, `UserPreferences`)

### Estructura de Archivos Recomendada

```
/app
  /dashboard          # Vista admin
  /pos                # Vista vendedor
  /api                # API routes
  layout.tsx
  page.tsx

/components
  /admin              # Componentes específicos de admin
  /pos                # Componentes específicos de POS
  /shared             # Componentes compartidos
  /ui                 # Componentes base (shadcn)
  /providers          # Context providers

/lib
  /hooks              # Custom hooks
  /stores             # Zustand stores
  /services           # Servicios de API/BD
  /types              # TypeScript types
  /utils              # Utilidades

/public
  /icons              # Iconos de PWA
  manifest.json
```

### Prioridades si Hay Limitaciones de Tiempo

Si el tiempo es limitado, priorizar en este orden:
1. Fase 0-3: Infraestructura base (CRÍTICO)
2. Fase 5: Vista POS vendedor (CRÍTICO)
3. Fase 4: Vista admin (ALTO)
4. Fase 6: Turnos de caja (MEDIO)
5. Fase 2: Roles completos (MEDIO)
6. Fase 7-9: Mejoras (BAJO)

---

**Documento creado para el proyecto Sistema POS v2.0**
**Optimizado para desarrollo con Antigravity**