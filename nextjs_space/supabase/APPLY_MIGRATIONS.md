# Cómo Aplicar Migraciones de Supabase

## Scripts de Migración Disponibles

- `005_fix_quote_items_column.sql` - Corrige columnas en quote_items
- `006_fix_sales_user_details_fk.sql` - **CRÍTICO**: Corrige la relación entre sales y user_details
- `007_fix_sales_totals_trigger.sql` - **URGENTE**: Elimina el trigger que recalcula incorrectamente los totales de ventas

## Opción 1: SQL Editor en Supabase Dashboard (Recomendado)

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Navega a **SQL Editor** en el menú lateral
3. Crea una **New Query**
4. Copia y pega el contenido del script SQL que necesitas aplicar
5. Haz clic en **Run** (ejecutar)
6. Verifica que no haya errores en la salida

### Para el Fix de Sales Foreign Key (URGENTE)

Si ves el error "Could not find a relationship between 'sales' and 'user_details'":

1. Abre `supabase/sql/006_fix_sales_user_details_fk.sql`
2. Copia todo el contenido
3. Pégalo en el SQL Editor de Supabase
4. Ejecuta el script
5. Verifica que aparezca el mensaje "Foreign key constraint creada exitosamente"

### Para el Fix de Totales de Ventas (CRÍTICO - EJECUTAR INMEDIATAMENTE)

Si los totales de ventas se muestran incorrectos (subtotal y total más altos de lo que deberían):

1. Abre `supabase/sql/007_fix_sales_totals_trigger.sql`
2. Copia todo el contenido
3. Pégalo en el SQL Editor de Supabase
4. Ejecuta el script
5. Verifica los mensajes de "Dropped trigger" en los resultados
6. **IMPORTANTE**: Si quieres corregir las ventas existentes, descomenta la sección "PASO 5" del script antes de ejecutar

## Opción 2: Supabase CLI (Local)

Si estás usando Supabase local:

```bash
# Iniciar Supabase local
npx supabase start

# Aplicar migraciones
npx supabase db reset

# O aplicar un script específico
npx supabase db execute -f supabase/sql/004_quotes_schema_update.sql
```

## Opción 3: Aplicar a producción con CLI

```bash
# Conectar a tu proyecto
npx supabase link --project-ref tu-project-ref

# Aplicar el script específico
npx supabase db push
```

## Verificación

### Para el Fix de Sales (006_fix_sales_user_details_fk.sql)

Después de aplicar la migración, verifica en el SQL Editor:

```sql
-- Verificar que la foreign key existe
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'sales'
    AND kcu.column_name = 'sold_by';
```

Deberías ver:
- `constraint_name`: `sales_sold_by_fkey`
- `table_name`: `sales`
- `column_name`: `sold_by`
- `foreign_table_name`: `user_details`
- `foreign_column_name`: `id`

### Para Quotes (005_fix_quote_items_column.sql)

```sql
-- Verificar que quote_items tiene todas las columnas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'quote_items'
ORDER BY ordinal_position;

-- Verificar que quotes tiene los constraints NOT NULL
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'quotes'
AND column_name IN ('location_id', 'created_by');
```

Deberías ver:
- `location_id` con `is_nullable = 'NO'`
- `created_by` con `is_nullable = 'NO'`
- Todas las columnas de `quote_items` incluyendo `discount_amount`, `tax_rate`, `tax_amount`

## Troubleshooting

### Error: "column location_id contains null values"

Si obtienes este error, primero ejecuta:

```sql
-- Obtener la primera ubicación activa
WITH first_location AS (
    SELECT id FROM locations WHERE is_active = true LIMIT 1
)
UPDATE quotes
SET location_id = (SELECT id FROM first_location)
WHERE location_id IS NULL;

-- Obtener el primer usuario
WITH first_user AS (
    SELECT id FROM auth.users LIMIT 1
)
UPDATE quotes
SET created_by = (SELECT id FROM first_user)
WHERE created_by IS NULL;
```

Luego vuelve a ejecutar el script de migración.
