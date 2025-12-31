# Sistema POS Multi-Tenant SaaS

Sistema de Punto de Venta (POS) multi-tenant construido como una aplicación SaaS moderna. Permite a múltiples negocios gestionar ventas, inventario, clientes y equipo de trabajo de forma independiente con aislamiento completo de datos.

## Stack Tecnológico

| Categoría | Tecnología |
|-----------|------------|
| **Frontend** | Next.js 14 + shadcn/ui + Tailwind CSS |
| **Backend** | Supabase (PostgreSQL + Auth + RLS) |
| **Estado** | TypeScript + Zustand |
| **Charts** | Recharts |
| **i18n** | next-intl (Español/Inglés) |
| **Arquitectura** | Multi-tenant con Row Level Security |

## Funcionalidades Principales

- **Autenticación Multi-tenant** - Login, registro con creación de negocio, OAuth con Google
- **Gestión de Ventas** - POS completo, carrito, múltiples métodos de pago, reembolsos
- **Inventario** - Productos, stock por ubicación, transferencias, alertas de bajo stock
- **Clientes** - CRM básico, historial de compras, puntos de lealtad
- **Equipo** - Gestión de usuarios, roles personalizables, permisos granulares
- **Reportes** - Dashboard con métricas, gráficos de ventas, productos más vendidos
- **Multi-ubicación** - Soporte para múltiples sucursales por negocio

---

## Estructura del Proyecto

```
nextjs_space/
├── app/                       # Páginas y rutas (App Router)
│   ├── auth/                  # Autenticación
│   │   ├── login/             # Inicio de sesión
│   │   ├── register/          # Registro de usuario
│   │   ├── complete-profile/  # Creación de negocio inicial
│   │   ├── recover-password/  # Recuperación de contraseña
│   │   └── ...
│   ├── dashboard/             # Panel principal (protegido)
│   │   ├── sales/             # Módulo de ventas y POS
│   │   ├── inventory/         # Gestión de productos y stock
│   │   ├── customers/         # Gestión de clientes
│   │   ├── reports/           # Reportes y estadísticas
│   │   ├── settings/          # Configuración
│   │   │   ├── team/          # Gestión de equipo
│   │   │   ├── roles/         # Gestión de roles
│   │   │   └── locations/     # Gestión de ubicaciones
│   │   ├── profile/           # Perfil de usuario
│   │   └── sessions/          # Gestión de sesiones
│   └── ...
├── components/                # Componentes React
│   ├── layout/                # Layouts (DashboardLayout, etc.)
│   ├── sales/                 # Componentes del módulo ventas
│   ├── inventory/             # Componentes del módulo inventario
│   └── ui/                    # Componentes shadcn/ui
├── lib/                       # Lógica de negocio
│   ├── services/              # Servicios de datos
│   │   ├── auth.service.ts    # Autenticación
│   │   ├── sales.service.ts   # Ventas
│   │   ├── product.service.ts # Productos
│   │   ├── inventory.service.ts # Inventario
│   │   ├── customer.service.ts  # Clientes
│   │   ├── team.service.ts    # Equipo
│   │   ├── roles.service.ts   # Roles
│   │   └── location.service.ts # Ubicaciones
│   ├── stores/                # Estados globales (Zustand)
│   ├── hooks/                 # Custom hooks
│   ├── types/                 # Definiciones TypeScript
│   ├── utils/                 # Utilidades y helpers
│   └── supabase/              # Configuración cliente Supabase
├── messages/                  # Traducciones (ES/EN)
├── supabase/                  # Base de datos
│   └── sql/                   # Scripts de producción
│       ├── 001_production_setup.sql
│       ├── 002_functions_triggers_rls.sql
│       └── 003_seed_data.sql
├── docs/                      # Documentación adicional
└── public/                    # Assets estáticos
```

---

## Instalación

### Prerrequisitos

- Node.js 18 o superior
- npm o yarn
- Cuenta de [Supabase](https://supabase.com)

### Pasos de Configuración

1. **Clonar el repositorio**

   ```bash
   git clone <repository-url>
   cd pos-system/nextjs_space
   ```

2. **Instalar dependencias**

   ```bash
   npm install
   ```

3. **Configurar variables de entorno**

   Crear archivo `.env.local` basándose en `.env.example`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
   ```

4. **Configurar la base de datos**

   Ejecutar los scripts SQL en el Editor SQL de Supabase en orden:

   ```
   1. supabase/sql/001_production_setup.sql      # Tablas y estructura
   2. supabase/sql/002_functions_triggers_rls.sql # Funciones, triggers, RLS
   3. supabase/sql/003_seed_data.sql              # Datos iniciales
   ```

5. **Iniciar el servidor de desarrollo**

   ```bash
   npm run dev
   ```

   La aplicación estará disponible en `http://localhost:3000`

---

## Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Iniciar servidor de desarrollo |
| `npm run build` | Compilar para producción |
| `npm run start` | Iniciar servidor de producción |
| `npm run lint` | Ejecutar linter |

---

## Documentación Adicional

- [Guía de Traducciones](./docs/TRANSLATION_GUIDE.md)
- [Guía de Formateo](./docs/FORMATTING_GUIDE.md)
- [Checklist i18n](./docs/I18N_CHECKLIST.md)
