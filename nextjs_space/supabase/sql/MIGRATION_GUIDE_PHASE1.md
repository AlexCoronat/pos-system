# Guía de Despliegue - Fase 1: Esquema de Base de Datos

## Descripción

Esta migración agrega el soporte de base de datos necesario para el sistema POS con interfaz dual (Admin/Vendedor).

## Tablas Nuevas Creadas

1. **user_preferences** - Preferencias de UI del usuario (vista predeterminada, tema, atajos de teclado)
2. **cash_registers** - Definición de cajas registradoras por ubicación
3. **cash_register_shifts** - Turnos de caja (apertura/cierre)
4. **cash_register_movements** - Movimientos de efectivo durante turnos
5. **offline_sync_queue** - Cola para sincronización de operaciones offline

## Modificaciones a Tablas Existentes

### Tabla `sales`
- `shift_id` - Vincula venta con turno de caja
- `is_offline` - Indica si se creó offline
- `offline_id` - ID temporal usado offline

### Tabla `products`
- `sale_frequency` - Contador de frecuencia de venta (para productos de acceso rápido)
- `is_favorite` - Marca producto como favorito

### Tabla `user_details`
- `preferred_view` - Vista preferida del usuario
- `default_cash_register_id` - Caja asignada por defecto

## Instrucciones de Despliegue

### Opción 1: Supabase Dashboard (Recomendado)

1. Abre el dashboard de Supabase
2. Navega a **SQL Editor**
3. Crea un nuevo query
4. Copia y pega todo el contenido de `migration-dual-view-phase1.sql`
5. Haz clic en **Run** para ejecutar la migración
6. Verifica los mensajes de éxito en la consola

### Opción 2: CLI de Supabase

```bash
# Si tienes Supabase CLI instalado
supabase db push --file supabase/sql/migration-dual-view-phase1.sql
```

### Opción 3: Script SQL Local

```bash
# Usando psql (si tienes acceso directo)
psql -h [tu-proyecto].supabase.co -U postgres -d postgres -f supabase/sql/migration-dual-view-phase1.sql
```

## Verificación Post-Migración

Después de ejecutar la migración, verifica que todo se creó correctamente:

```sql
-- Verificar que las tablas existan
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'user_preferences',
    'cash_registers',
    'cash_register_shifts',
    'cash_register_movements',
    'offline_sync_queue'
);
-- Debe retornar 5 filas

-- Verificar columnas agregadas a sales
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'sales' 
AND column_name IN ('shift_id', 'is_offline', 'offline_id');
-- Debe retornar 3 filas

-- Verificar columnas agregadas a products
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'products' 
AND column_name IN ('sale_frequency', 'is_favorite');
-- Debe retornar 2 filas

-- Verificar columnas agregadas a user_details
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_details' 
AND column_name IN ('preferred_view', 'default_cash_register_id');
-- Debe retornar 2 filas
```

## Datos de Prueba Iniciales (Opcional)

Puedes crear registros de prueba para validar:

```sql
-- Crear una caja registradora de prueba
INSERT INTO public.cash_registers (business_id, location_id, name, code, is_active, is_main)
VALUES (
    (SELECT id FROM businesses LIMIT 1),
    (SELECT id FROM locations LIMIT 1),
    'Caja Principal',
    'CAJA-01',
    true,
    true
);

-- Crear preferencias para tu usuario
INSERT INTO public.user_preferences (user_id, business_id, default_view)
VALUES (
    auth.uid(),
    (SELECT business_id FROM user_details WHERE id = auth.uid()),
    'auto'
);
```

## Rollback (Si es Necesario)

Si necesitas revertir la migración:

```sql
-- ADVERTENCIA: Esto eliminará todas las tablas nuevas y datos
DROP TABLE IF EXISTS public.offline_sync_queue CASCADE;
DROP TABLE IF EXISTS public.cash_register_movements CASCADE;
DROP TABLE IF EXISTS public.cash_register_shifts CASCADE;
DROP TABLE IF EXISTS public.cash_registers CASCADE;
DROP TABLE IF EXISTS public.user_preferences CASCADE;

-- Eliminar columnas agregadas
ALTER TABLE public.sales DROP COLUMN IF EXISTS shift_id;
ALTER TABLE public.sales DROP COLUMN IF EXISTS is_offline;
ALTER TABLE public.sales DROP COLUMN IF EXISTS offline_id;

ALTER TABLE public.products DROP COLUMN IF EXISTS sale_frequency;
ALTER TABLE public.products DROP COLUMN IF EXISTS is_favorite;

ALTER TABLE public.user_details DROP COLUMN IF EXISTS preferred_view;
ALTER TABLE public.user_details DROP COLUMN IF EXISTS default_cash_register_id;

-- Eliminar función de generar número de turno
DROP FUNCTION IF EXISTS public.generate_shift_number(BIGINT);
DROP FUNCTION IF EXISTS public.increment_product_sale_frequency();
```

## Próximos Pasos

Una vez que la migración se ejecute exitosamente:

1. ✅ Verifica que todas las tablas se crearon
2. ✅ Confirma que las políticas RLS están activas
3. ✅ Valida que los índices se crearon
4. 📋 Procede con la **Fase 2: Administración de Estado de Vista** (View State Management)

## Notas Importantes

- ⚠️ Esta migración usa `IF NOT EXISTS` y bloques `DO $$` para ser idempotente (puede ejecutarse múltiples veces sin error)
- 🔒 Todas las tablas nuevas tienen Row Level Security (RLS) habilitado
- 📊 Se crearon índices para optimizar consultas frecuentes
- 🔄 Los triggers `updated_at` se configuraron automáticamente
- 🎯 La función `increment_product_sale_frequency()` se ejecutará automáticamente al crear sale_items

## Soporte

Si encuentras algún error durante la migración, revisa:
1. Los mensajes de error en el SQL Editor
2. Los logs de Supabase
3. Que tengas permisos suficientes en la base de datos
