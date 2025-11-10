# Guía de Migración - Nuevas Mejores Prácticas

Esta guía te ayudará a migrar el código existente para usar las nuevas mejores prácticas implementadas.

## 🎯 Objetivo

Migrar todos los archivos existentes para usar:
- ✅ Constantes centralizadas
- ✅ Validaciones con Zod
- ✅ Servicio de auth optimizado
- ✅ Manejo de errores mejorado
- ✅ Nuevos hooks optimizados

---

## 📝 Cambios en Imports

### Antes → Ahora

```typescript
// ❌ ANTES
import { authService } from '@/lib/auth/auth-service'
import { useAuth } from '@/lib/auth/use-auth'

// ✅ AHORA
import { authService } from '@/lib/services/auth.service'
import { useAuth } from '@/lib/hooks/use-auth'
```

```typescript
// ❌ ANTES
import { GoogleOAuthButton } from '@/components/auth/google-oauth-button'

// ✅ AHORA
import { GoogleOAuthButton } from '@/components/auth/GoogleOAuthButton'
```

```typescript
// ❌ ANTES
import { STORAGE_KEYS, DEFAULT_PERMISSIONS } from '@/lib/types/auth'

// ✅ AHORA
import { STORAGE_KEYS, DEFAULT_PERMISSIONS, AUTH_CONSTANTS } from '@/lib/constants'
```

---

## 🔄 Actualización de Archivos Existentes

### 1. Actualizar `/app/auth/login/page.tsx`

**Cambios necesarios:**

```typescript
// Agregar imports
import { ROUTES, MESSAGES } from '@/lib/constants'
import { loginSchema } from '@/lib/validations'
import { getUserFriendlyMessage } from '@/lib/utils'

// Actualizar import del componente Google
import { GoogleOAuthButton } from '@/components/auth/GoogleOAuthButton'

// Actualizar manejo de errores
try {
  await login(formData)
  toast(MESSAGES.AUTH.LOGIN_SUCCESS)
  router.push(redirectTo)
} catch (error: any) {
  toast({
    ...MESSAGES.AUTH.LOGIN_FAILED,
    description: getUserFriendlyMessage(error),
    variant: 'destructive',
  })
}

// Opcional: Agregar validación con Zod
const result = loginSchema.safeParse(formData)
if (!result.success) {
  // Manejar errores de validación
  return
}
```

### 2. Actualizar `/app/auth/register/page.tsx`

**Cambios necesarios:**

```typescript
// Agregar imports
import { ROUTES, MESSAGES, AUTH_CONSTANTS } from '@/lib/constants'
import { registerSchema } from '@/lib/validations'
import { getUserFriendlyMessage } from '@/lib/utils'
import { GoogleOAuthButton } from '@/components/auth/GoogleOAuthButton'

// Actualizar mensajes
toast(MESSAGES.AUTH.REGISTER_SUCCESS)

// Actualizar rutas
router.push(ROUTES.DASHBOARD)

// Opcional: Agregar validación con Zod antes del submit
const result = registerSchema.safeParse({
  ...formData,
  confirmPassword
})
if (!result.success) {
  // Mostrar errores
  return
}
```

### 3. Actualizar `/app/auth/callback/page.tsx`

**Cambios necesarios:**

```typescript
// Actualizar imports
import { authService } from '@/lib/services/auth.service'
import { ROUTES, MESSAGES } from '@/lib/constants'
import { getUserFriendlyMessage } from '@/lib/utils'

// Actualizar rutas
router.push(ROUTES.AUTH.COMPLETE_PROFILE)
router.push(ROUTES.DASHBOARD)
router.push(ROUTES.AUTH.LOGIN)

// Actualizar mensajes
toast(MESSAGES.AUTH.LOGIN_SUCCESS)
toast({
  ...MESSAGES.AUTH.OAUTH_FAILED,
  description: getUserFriendlyMessage(error),
  variant: 'destructive',
})
```

### 4. Actualizar `/app/auth/complete-profile/page.tsx`

**Cambios necesarios:**

```typescript
// Agregar imports
import { ROUTES, MESSAGES } from '@/lib/constants'
import { completeProfileSchema } from '@/lib/validations'
import { authService } from '@/lib/services/auth.service'
import { getUserFriendlyMessage } from '@/lib/utils'

// Actualizar rutas
router.push(ROUTES.AUTH.LOGIN)
router.push(ROUTES.DASHBOARD)

// Actualizar mensajes
toast(MESSAGES.AUTH.PROFILE_COMPLETE_SUCCESS)

// Opcional: Validar con Zod
const result = completeProfileSchema.safeParse(formData)
if (!result.success) {
  // Manejar errores
  return
}
```

---

## 🗂️ Archivos a Eliminar (Después de Migración)

Una vez que hayas actualizado todos los imports, puedes eliminar estos archivos legacy:

```bash
# Archivos a eliminar
/lib/auth/auth-service.ts
/lib/auth/use-auth.ts
/components/auth/google-oauth-button.tsx
```

**⚠️ IMPORTANTE**: Solo elimina estos archivos después de:
1. Actualizar todos los imports
2. Probar que todo funciona
3. Verificar que no hay errores de compilación

---

## 🧪 Verificación

### Checklist de Migración

Para cada archivo migrado, verifica:

- [ ] Imports actualizados
- [ ] Uso de constantes en lugar de strings hardcodeados
- [ ] Mensajes usando `MESSAGES` de constantes
- [ ] Rutas usando `ROUTES` de constantes
- [ ] Manejo de errores con `getUserFriendlyMessage`
- [ ] (Opcional) Validación con Zod implementada
- [ ] Archivo compila sin errores
- [ ] Funcionalidad probada

### Pruebas Requeridas

Después de migrar, prueba:

1. **Login con email/password**
   - [ ] Login exitoso redirige al dashboard
   - [ ] Login fallido muestra error apropiado
   - [ ] Remember me funciona

2. **Registro con email/password**
   - [ ] Registro exitoso crea usuario
   - [ ] Validación de contraseña funciona
   - [ ] Confirmación de contraseña funciona
   - [ ] Terms & conditions se validan

3. **OAuth con Google**
   - [ ] Botón de Google funciona
   - [ ] Callback maneja correctamente
   - [ ] Nuevos usuarios redirigen a complete-profile
   - [ ] Usuarios existentes van al dashboard

4. **Complete Profile**
   - [ ] Formulario valida correctamente
   - [ ] Datos se guardan en BD
   - [ ] Redirige al dashboard después

---

## 💡 Ejemplos de Migración

### Ejemplo 1: Reemplazar Rutas Hardcodeadas

**Antes:**
```typescript
router.push('/auth/login')
router.push('/dashboard')
router.push('/auth/complete-profile')
```

**Después:**
```typescript
import { ROUTES } from '@/lib/constants'

router.push(ROUTES.AUTH.LOGIN)
router.push(ROUTES.DASHBOARD)
router.push(ROUTES.AUTH.COMPLETE_PROFILE)
```

### Ejemplo 2: Reemplazar Mensajes Hardcodeados

**Antes:**
```typescript
toast({
  title: "Welcome back!",
  description: "You have been successfully logged in.",
})

toast({
  title: "Login failed",
  description: error.message || "Invalid email or password",
  variant: "destructive",
})
```

**Después:**
```typescript
import { MESSAGES } from '@/lib/constants'
import { getUserFriendlyMessage } from '@/lib/utils'

toast(MESSAGES.AUTH.LOGIN_SUCCESS)

toast({
  ...MESSAGES.AUTH.LOGIN_FAILED,
  description: getUserFriendlyMessage(error),
  variant: "destructive",
})
```

### Ejemplo 3: Agregar Validación con Zod

**Antes:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  if (!formData.email || !formData.password) {
    toast({
      title: "Error",
      description: "Please fill in all required fields",
      variant: "destructive",
    })
    return
  }

  // ... continuar con login
}
```

**Después:**
```typescript
import { loginSchema } from '@/lib/validations'
import { MESSAGES } from '@/lib/constants'

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  // Validar con Zod
  const result = loginSchema.safeParse(formData)

  if (!result.success) {
    // Mostrar el primer error de validación
    const firstError = result.error.issues[0]
    toast({
      title: "Validation Error",
      description: firstError.message,
      variant: "destructive",
    })
    return
  }

  // result.data está tipado y validado
  // ... continuar con login usando result.data
}
```

### Ejemplo 4: Usar Constantes de Auth

**Antes:**
```typescript
role_id: 3  // ¿Qué rol es este?

if (passwordStrength < 3) {
  // ...
}
```

**Después:**
```typescript
import { AUTH_CONSTANTS } from '@/lib/constants'

role_id: AUTH_CONSTANTS.ROLES.SELLER

if (formData.password.length < AUTH_CONSTANTS.PASSWORD.MIN_LENGTH) {
  // ...
}
```

---

## 🚀 Script de Migración Automática

Puedes crear un script para ayudar con la migración:

```typescript
// scripts/migrate-imports.ts
import { readFileSync, writeFileSync } from 'fs'
import { glob } from 'glob'

const files = glob.sync('app/**/*.tsx')

files.forEach(file => {
  let content = readFileSync(file, 'utf-8')

  // Reemplazar imports
  content = content.replace(
    /@\/lib\/auth\/auth-service/g,
    '@/lib/services/auth.service'
  )
  content = content.replace(
    /@\/lib\/auth\/use-auth/g,
    '@/lib/hooks/use-auth'
  )
  content = content.replace(
    /google-oauth-button/g,
    'GoogleOAuthButton'
  )

  writeFileSync(file, content)
})

console.log('Migration completed!')
```

---

## 📞 Soporte

Si encuentras problemas durante la migración:

1. Consulta `PROJECT_STRUCTURE.md` para entender la nueva estructura
2. Revisa `OPTIMIZATION_SUMMARY.md` para ver todas las mejoras
3. Consulta los ejemplos en esta guía
4. Verifica que todos los imports estén correctos

---

## ✅ Checklist Final

Antes de considerar la migración completa:

- [ ] Todos los archivos de `/app/auth/*` migrados
- [ ] Todos los componentes de `/components/auth/*` actualizados
- [ ] Imports actualizados en todos los archivos
- [ ] Tests pasan (cuando se implementen)
- [ ] Aplicación compila sin errores
- [ ] Aplicación funciona correctamente en desarrollo
- [ ] Archivos legacy eliminados
- [ ] Documentación actualizada

---

**Última actualización**: 2025-11-10
**Versión**: 1.0.0
