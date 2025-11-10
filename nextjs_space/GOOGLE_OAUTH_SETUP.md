# Configuración de Google OAuth

Este documento describe cómo configurar Google OAuth en tu proyecto de Supabase.

## Pasos de Configuración

### 1. Configurar Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Ve a "APIs & Services" > "Credentials"
4. Haz clic en "Create Credentials" > "OAuth 2.0 Client ID"
5. Selecciona "Web application"
6. Configura los URIs autorizados:
   - **Authorized JavaScript origins**: `http://localhost:3000` (desarrollo)
   - **Authorized redirect URIs**:
     - `https://yttilwxsaidotjgyxhih.supabase.co/auth/v1/callback`
     - `http://localhost:3000/auth/callback` (desarrollo)
7. Guarda el **Client ID** y **Client Secret**

### 2. Configurar Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a "Authentication" > "Providers"
3. Busca "Google" y habilítalo
4. Ingresa tu **Client ID** y **Client Secret** de Google
5. Guarda los cambios

### 3. Configurar URLs de Redirección

En tu panel de Supabase, ve a "Authentication" > "URL Configuration" y asegúrate de que:

- **Site URL**: `http://localhost:3000` (desarrollo) o tu dominio de producción
- **Redirect URLs**:
  - `http://localhost:3000/auth/callback`
  - Tu URL de producción + `/auth/callback`

## Flujo de Autenticación

### Login con Google
1. El usuario hace clic en "Sign in with Google"
2. Es redirigido a Google para autenticarse
3. Después de la autenticación, Google redirige a `/auth/callback`
4. El callback verifica si el perfil del usuario está completo
5. Si no está completo, redirige a `/auth/complete-profile`
6. Si está completo, redirige a `/dashboard`

### Registro con Google
1. El usuario hace clic en "Sign up with Google"
2. Sigue el mismo flujo que el login
3. Si es un nuevo usuario, se crea automáticamente en la base de datos
4. Se solicitan datos adicionales (nombre, dirección) en `/auth/complete-profile`

## Archivos Modificados/Creados

### Nuevos archivos:
- `components/auth/google-oauth-button.tsx` - Componente del botón de Google OAuth
- `app/auth/callback/page.tsx` - Página de callback para OAuth
- `app/auth/complete-profile/page.tsx` - Página para completar perfil

### Archivos modificados:
- `lib/auth/auth-service.ts` - Agregados métodos OAuth
- `app/auth/login/page.tsx` - Agregado botón de Google
- `app/auth/register/page.tsx` - Agregado botón de Google

## Estructura de la Base de Datos

El flujo OAuth asume que la tabla `pos_core.users` tiene los siguientes campos:
- `id` (UUID) - ID del usuario de Supabase
- `email` (string)
- `first_name` (string) - Requerido para perfil completo
- `last_name` (string) - Requerido para perfil completo
- `phone` (string, opcional)
- `role_id` (integer) - Por defecto: 3 (Seller)
- `is_active` (boolean)
- `email_verified` (boolean)
- `metadata` (JSONB) - Para datos adicionales como dirección

## Validación

Para verificar que todo funciona correctamente:

1. Inicia el servidor de desarrollo: `npm run dev`
2. Ve a `http://localhost:3000/auth/login`
3. Haz clic en "Sign in with Google"
4. Completa el flujo de autenticación
5. Verifica que te redirige correctamente

## Solución de Problemas

### Error: "Invalid redirect URL"
- Verifica que las URLs de redirección estén configuradas correctamente en Google Cloud Console y Supabase

### Error: "User not found"
- Asegúrate de que la tabla `pos_core.users` existe y tiene los permisos correctos

### El callback no funciona
- Verifica que `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` estén configurados en `.env`

## Seguridad

- Las credenciales de Google deben mantenerse seguras y no compartirse
- Usa variables de entorno para las credenciales
- Nunca commitees el archivo `.env` al repositorio
- En producción, actualiza las URLs autorizadas a tu dominio real
