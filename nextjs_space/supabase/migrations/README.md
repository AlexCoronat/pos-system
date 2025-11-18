# Migraciones de Base de Datos

Este directorio contiene las migraciones SQL para el sistema POS.

## Cómo ejecutar las migraciones

### Opción 1: Usando Supabase CLI (Recomendado)

Si tienes el CLI de Supabase instalado:

```bash
# Vincular tu proyecto
supabase link --project-ref <tu-project-ref>

# Ejecutar todas las migraciones pendientes
supabase db push
```

### Opción 2: Usando la consola de Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **SQL Editor** en el menú lateral
3. Abre el archivo de migración
4. Copia y pega el contenido SQL
5. Ejecuta la consulta

### Opción 3: Usando el cliente de PostgreSQL

```bash
psql postgresql://postgres:[password]@[host]:[port]/postgres -f migrations/20251117_search_products_function.sql
```

## Migraciones disponibles

### `20251117_search_products_function.sql`

Crea la función `search_products_with_inventory` que permite buscar productos con su información de inventario para una ubicación específica.

**Uso:**
```sql
SELECT * FROM pos_sales.search_products_with_inventory('libreta', 1);
```

Esta función es utilizada por el componente `ProductSearch` en la interfaz de ventas.

## Orden de ejecución

Las migraciones deben ejecutarse en orden cronológico basado en el timestamp en el nombre del archivo:

1. `20251117_search_products_function.sql`

## Notas importantes

- Estas migraciones asumen que ya existe el esquema base de datos creado en `db/schema.sql`
- Asegúrate de tener los permisos necesarios para crear funciones en tu base de datos
- Las funciones usan `SECURITY DEFINER` para permitir acceso seguro a los datos
