# Estructura del Proyecto - POS System

Este documento describe la organización del proyecto siguiendo las mejores prácticas de Next.js 14, TypeScript y React.

## 📁 Estructura de Carpetas

```
nextjs_space/
├── app/                          # Next.js App Router (rutas de la aplicación)
│   ├── auth/                     # Páginas de autenticación
│   │   ├── login/               # Página de inicio de sesión
│   │   ├── register/            # Página de registro
│   │   ├── callback/            # Callback de OAuth
│   │   ├── complete-profile/    # Completar perfil después de OAuth
│   │   └── recover-password/    # Recuperación de contraseña
│   ├── dashboard/               # Dashboard principal
│   ├── layout.tsx               # Layout raíz de la aplicación
│   └── page.tsx                 # Página de inicio
│
├── components/                   # Componentes reutilizables
│   ├── auth/                    # Componentes específicos de autenticación
│   │   └── GoogleOAuthButton.tsx
│   ├── ui/                      # Componentes UI de shadcn/ui
│   └── theme-provider.tsx       # Proveedor de temas
│
├── lib/                         # Lógica de negocio y utilidades
│   ├── auth/                    # Módulo de autenticación (legacy)
│   │   ├── auth-service.ts      # [DEPRECATED] Use services/auth.service.ts
│   │   └── use-auth.ts          # [DEPRECATED] Use hooks/use-auth.ts
│   │
│   ├── config/                  # ✨ Configuración de la aplicación
│   │   ├── env.ts              # Variables de entorno tipadas
│   │   └── index.ts            # Barrel export
│   │
│   ├── constants/               # ✨ Constantes de la aplicación
│   │   ├── auth.ts             # Constantes de autenticación
│   │   ├── routes.ts           # Rutas de la aplicación
│   │   ├── messages.ts         # Mensajes de usuario
│   │   └── index.ts            # Barrel export
│   │
│   ├── hooks/                   # ✨ Custom hooks optimizados
│   │   └── use-auth.ts         # Hook de autenticación
│   │
│   ├── services/                # ✨ Servicios de la aplicación
│   │   └── auth.service.ts     # Servicio de autenticación optimizado
│   │
│   ├── supabase/                # Cliente de Supabase
│   │   ├── client.ts           # Cliente del navegador
│   │   ├── server.ts           # Cliente del servidor
│   │   └── middleware.ts       # Middleware de Supabase
│   │
│   ├── types/                   # Definiciones de TypeScript
│   │   ├── auth.ts             # Tipos de autenticación
│   │   ├── database.ts         # Tipos de base de datos
│   │   └── index.ts            # Tipos generales
│   │
│   ├── utils/                   # ✨ Funciones utilitarias
│   │   ├── error-handler.ts    # Manejo centralizado de errores
│   │   ├── logger.ts           # Logger de la aplicación
│   │   ├── index.ts            # Barrel export
│   │   └── [utils.ts]          # Utilidades de shadcn/ui
│   │
│   └── validations/             # ✨ Schemas de validación (Zod)
│       ├── auth.ts             # Validaciones de autenticación
│       └── index.ts            # Barrel export
│
├── hooks/                       # Hooks globales
│   └── use-toast.ts            # Hook de toast notifications
│
├── prisma/                      # Prisma ORM
│   └── schema.prisma           # Schema de base de datos
│
├── public/                      # Assets estáticos
│
├── .env                        # Variables de entorno (no commitear)
├── .env.local                  # Variables de entorno locales
├── .env.example                # Ejemplo de variables de entorno
├── .gitignore                  # Archivos ignorados por Git
├── middleware.ts               # Middleware de Next.js
├── next.config.js              # Configuración de Next.js
├── package.json                # Dependencias del proyecto
├── tailwind.config.ts          # Configuración de Tailwind CSS
└── tsconfig.json               # Configuración de TypeScript
```

## 🎯 Principios de Diseño

### 1. Separación de Responsabilidades
- **`/app`**: Solo rutas y páginas (componentes de página)
- **`/components`**: Componentes reutilizables de UI
- **`/lib`**: Lógica de negocio, utilidades y servicios

### 2. Organización Modular
Cada módulo (`auth`, `inventory`, etc.) contiene:
- Servicios: Lógica de negocio
- Hooks: Estado y efectos secundarios
- Tipos: Definiciones de TypeScript
- Validaciones: Schemas de Zod

### 3. Centralización
- **Constantes**: Todas las constantes en `/lib/constants`
- **Configuración**: Toda la configuración en `/lib/config`
- **Mensajes**: Todos los mensajes de usuario en `/lib/constants/messages.ts`
- **Rutas**: Todas las rutas en `/lib/constants/routes.ts`

### 4. Type Safety
- Uso extensivo de TypeScript
- Validaciones con Zod
- Tipos inferidos de schemas

## 🔄 Patrones de Importación

### Importaciones Recomendadas

```typescript
// ✅ CORRECTO - Usar barrel exports
import { ROUTES, MESSAGES, AUTH_CONSTANTS } from '@/lib/constants'
import { authService } from '@/lib/services/auth.service'
import { useAuth } from '@/lib/hooks/use-auth'
import { loginSchema } from '@/lib/validations'

// ❌ INCORRECTO - Importar directamente
import { ROUTES } from '@/lib/constants/routes'
import { MESSAGES } from '@/lib/constants/messages'
```

### Path Aliases Configurados

```typescript
'@/*' -> './*'  // Raíz del proyecto
```

## 📝 Mejores Prácticas Implementadas

### 1. Manejo de Errores
```typescript
// Uso centralizado de manejo de errores
import { parseAuthError, getUserFriendlyMessage } from '@/lib/utils'

try {
  await someOperation()
} catch (error) {
  const authError = parseAuthError(error)
  const message = getUserFriendlyMessage(authError)
  toast({ title: 'Error', description: message })
}
```

### 2. Logging
```typescript
// Logger centralizado
import { logger } from '@/lib/utils'

logger.info('User logged in', { userId: user.id })
logger.error('Login failed', { error })
```

### 3. Validación con Zod
```typescript
import { loginSchema } from '@/lib/validations'

const result = loginSchema.safeParse(formData)
if (!result.success) {
  // Manejar errores de validación
  console.error(result.error.issues)
}
```

### 4. Constantes Tipadas
```typescript
import { ROUTES, AUTH_CONSTANTS } from '@/lib/constants'

// Type-safe routes
router.push(ROUTES.AUTH.LOGIN)

// Type-safe role IDs
const roleId = AUTH_CONSTANTS.ROLES.SELLER
```

### 5. Mensajes Consistentes
```typescript
import { MESSAGES } from '@/lib/constants'

toast({
  ...MESSAGES.AUTH.LOGIN_SUCCESS,
  variant: 'default'
})
```

## 🔧 Configuración de Entorno

### Variables de Entorno
Todas las variables de entorno están tipadas y validadas en `/lib/config/env.ts`:

```typescript
import { env } from '@/lib/config'

// Type-safe access
const supabaseUrl = env.supabase.url
const appName = env.app.name
```

## 🚀 Migraciones Pendientes

### Archivos Legacy (a migrar)
- ❌ `/lib/auth/auth-service.ts` → ✅ `/lib/services/auth.service.ts`
- ❌ `/lib/auth/use-auth.ts` → ✅ `/lib/hooks/use-auth.ts`
- ❌ `/components/auth/google-oauth-button.tsx` → ✅ `/components/auth/GoogleOAuthButton.tsx`

### Pasos para Migración
1. Actualizar imports en componentes existentes
2. Probar funcionalidad
3. Eliminar archivos legacy

## 📚 Recursos

- [Next.js 14 Documentation](https://nextjs.org/docs)
- [TypeScript Best Practices](https://typescript-eslint.io/)
- [Zod Documentation](https://zod.dev/)
- [Supabase Documentation](https://supabase.com/docs)

## 🔐 Seguridad

### Variables de Entorno
- Nunca commitear `.env` o `.env.local`
- Usar `.env.example` como plantilla
- Todas las variables públicas deben tener prefijo `NEXT_PUBLIC_`

### Validación
- Validar todos los inputs del usuario con Zod
- Sanitizar datos antes de enviar a la base de datos
- Validar tipos en tiempo de compilación con TypeScript

## 🧪 Testing (Por implementar)

```
tests/
├── unit/                # Tests unitarios
├── integration/         # Tests de integración
└── e2e/                # Tests end-to-end
```

## 📦 Scripts Disponibles

```bash
npm run dev          # Iniciar servidor de desarrollo
npm run build        # Construir para producción
npm run start        # Iniciar servidor de producción
npm run lint         # Ejecutar ESLint
```

---

**Última actualización**: 2025
**Mantenedor**: Equipo de desarrollo
