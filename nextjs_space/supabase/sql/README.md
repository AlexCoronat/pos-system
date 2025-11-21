# POS System - Database Setup Scripts

Scripts SQL para levantar la base de datos de producción del sistema POS multi-tenant.

## Estructura de archivos

```
supabase/sql/
├── 001_production_setup.sql      # Tablas y estructura
├── 002_functions_triggers_rls.sql # Funciones, triggers y RLS
├── 003_seed_data.sql              # Datos iniciales
└── README.md                      # Este archivo
```

## Requisitos previos

1. Proyecto de Supabase creado
2. Acceso al SQL Editor de Supabase
3. Variables de entorno configuradas

## Instrucciones de instalación

### Opción 1: Ejecución manual en Supabase

1. Ir al [SQL Editor](https://supabase.com/dashboard) de tu proyecto
2. Ejecutar los scripts en orden:
   - Primero: `001_production_setup.sql`
   - Segundo: `002_functions_triggers_rls.sql`
   - Tercero: `003_seed_data.sql`

### Opción 2: Usando Supabase CLI

```bash
# Instalar Supabase CLI si no está instalado
npm install -g supabase

# Conectar con tu proyecto
supabase link --project-ref <your-project-ref>

# Ejecutar los scripts
supabase db push
```

## Arquitectura Multi-tenant

El sistema utiliza **base de datos compartida con RLS** (Row Level Security):

- Cada negocio tiene un `business_id` único
- Los datos se filtran automáticamente por `business_id`
- Las políticas RLS garantizan aislamiento de datos

```sql
-- Ejemplo de política RLS
CREATE POLICY "Users can view own business products" ON products
    FOR SELECT USING (business_id = get_user_business_id());
```

## Planes de suscripción

| Plan | Usuarios | Ubicaciones | Productos | Precio/mes |
|------|----------|-------------|-----------|------------|
| Free | 2 | 1 | 100 | $0 |
| Starter | 5 | 2 | 500 | $299 |
| Professional | 15 | 5 | 2,000 | $599 |
| Enterprise | Ilimitado | Ilimitado | Ilimitado | $1,299 |

## Roles del sistema

- **Admin**: Acceso completo
- **Manager**: Reportes y configuración
- **Cashier**: Solo ventas
- **Inventory**: Gestión de inventario

## Funciones importantes

### `get_user_business_id()`
Retorna el `business_id` del usuario autenticado.

### `check_plan_limit(business_id, resource_type)`
Verifica si el negocio puede agregar más recursos según su plan.

### `handle_new_user()`
Crea automáticamente el perfil en `user_details` cuando se registra un usuario.

## Verificación post-instalación

Ejecutar para verificar que todo está correcto:

```sql
-- Verificar tablas creadas
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verificar roles del sistema
SELECT id, name, is_system FROM roles
WHERE business_id IS NULL;

-- Verificar planes
SELECT id, name, max_users, max_products FROM subscription_plans;

-- Verificar RLS habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;
```

## Troubleshooting

### Error: "permission denied for table..."
Verificar que se ejecutó la sección de GRANTS en `002_functions_triggers_rls.sql`

### Error: "function get_user_business_id does not exist"
Ejecutar primero `002_functions_triggers_rls.sql` antes de los demás scripts

### Error: "duplicate key value violates unique constraint"
Los datos iniciales ya fueron insertados. Puedes ignorar este error o truncar las tablas primero.

## Mantenimiento

### Backup
```bash
supabase db dump -f backup.sql
```

### Restaurar
```bash
psql -h <host> -U postgres -d postgres -f backup.sql
```

## Contacto

Para soporte o preguntas, contactar al equipo de desarrollo.
