# Translation Guide

## Overview

This guide explains how to add and maintain translations in the POS system. We use `next-intl` for internationalization with support for Spanish (es) and English (en).

## File Structure

```
messages/
├── es.json  # Spanish translations
└── en.json  # English translations
```

## Adding New Translations

### 1. Identify the Appropriate Section

**Use existing sections:**
- `common` - Reusable UI elements (buttons, confirmations, empty states)
- `validation` - Form validation messages
- `notifications` - Toast/notification messages
- `table` - Table and pagination elements
- `datetime` - Date/time labels
- `errors` - Error messages

**Module-specific sections:**
- `auth` - Authentication pages
- `dashboard` - Dashboard page
- `sales` - Sales module
- `inventory` - Inventory module  
- `customers` - Customers module
- `reports` - Reports module
- `settings` - Settings pages
- `team` - Team management
- `roles` - Roles & permissions
- `locations` - Locations management
- `profile` - User profile
- `sessions` - Session management

### 2. Add Keys to Both Language Files

Always add translations to **both** `es.json` and `en.json`:

```json
// messages/es.json
{
  "sales": {
    "newFeature": {
      "title": "Nueva Funcionalidad",
      "description": "Descripción de la funcionalidad",
      "action": "Crear nueva venta"
    }
  }
}

// messages/en.json
{
  "sales": {
    "newFeature": {
      "title": "New Feature",
      "description": "Feature description",
      "action": "Create new sale"
    }
  }
}
```

### 3. Use in Components

```tsx
import { useTranslations } from 'next-intl'

function MyComponent() {
  const t = useTranslations('sales.newFeature')
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
      <Button>{t('action')}</Button>
    </div>
  )
}
```

## Naming Conventions

### Key Naming Rules

1. **Use camelCase**: `userName`, `sendMessage`, `lastLogin`
2. **Be descriptive but concise**: `createNewCustomer` not `c` or `createANewCustomerInTheSystem`
3. **Group related keys**: Use nested objects for organization
4. **Use consistent patterns**: Follow existing conventions

### Common Pattern Examples

**Actions:**
```json
{
  "actions": {
    "create": "Create",
    "edit": "Edit",
    "delete": "Delete",
    "save": "Save",
    "cancel": "Cancel"
  }
}
```

**Validation:**
```json
{
  "validation": {
    "required": "This field is required",
    "minLength": "Must be at least {min} characters",
    "email": "Invalid email format"
  }
}
```

**Status/States:**
```json
{
  "status": {
    "active": "Active",
    "inactive": "Inactive",
    "pending": "Pending"
  }
}
```

**Messages:**
```json
{
  "messages": {
    "success": "Operation completed successfully",
    "error": "An error occurred",
    "loading": "Loading..."
  }
}
```

## String Interpolation

For dynamic content, use placeholders:

```json
{
  "greeting": "Hello, {name}!",
  "itemCount": "Showing {count} items",
  "dateRange": "From {start} to {end}"
}
```

**Usage:**
```tsx
t('greeting', { name: 'John' })
// Output: "Hello, John!"

t('itemCount', { count: 5 })
// Output: "Showing 5 items"
```

## Pluralization

Use different keys for singular and plural:

```json
{
  "items": {
    "one": "{count} item",
    "other": "{count} items"
  }
}
```

**Or handle in component:**
```tsx
{count === 1 ? t('item') : t('items')}
```

## Best Practices

### ✅ DO

- Add translations for ALL user-facing text
- Keep translations consistent across similar contexts
- Use interpolation for dynamic content
- Group related translations together
- Test in both languages before submitting

### ❌ DON'T

- Leave hardcoded strings in components
- Add keys to only one language file
- Use overly long key names
- Duplicate translation values (use common instead)
- Forget to handle pluralization

## Common Scenarios

### Adding a New Page

1. Create a section in JSON files:
```json
{
  "myNewPage": {
    "title": "Page Title",
    "subtitle": "Page Description",
    "actions": {
      "create": "Create New"
    },
    "table": {
      "name": "Name",
      "date": "Date"
    }
  }
}
```

2. Use in page component:
```tsx
const t = useTranslations('myNewPage')

return (
  <>
    <h1>{t('title')}</h1>
    <p>{t('subtitle')}</p>
    <Button>{t('actions.create')}</Button>
  </>
)
```

### Adding Toast Messages

1. Add to notifications or module:
```json
{
  "sales": {
    "messages": {
      "saleCreated": "Sale created successfully",
      "saleError": "Error creating sale"
    }
  }
}
```

2. Use:
```tsx
toast.success(t('messages.saleCreated'))
toast.error(t('messages.saleError'))
```

### Adding Form Validation

1. Add validation messages:
```json
{
  "productForm": {
    "validation": {
      "nameRequired": "Product name is required",
      "priceMin": "Price must be greater than 0",
      "stockPositive": "Stock must be a positive number"
    }
  }
}
```

2. Use in validation:
```tsx
if (!name) return t('validation.nameRequired')
if (price <= 0) return t('validation.priceMin')
```

## Reusing Common Translations

Instead of duplicating, use common translations:

```tsx
// ❌ Don't do this
t('myModule.save') // Duplicating "Save" everywhere

// ✅ Do this instead
const tCommon = useTranslations('common.actions')
<Button>{tCommon('save')}</Button>
```

## Translation Checklist

Before submitting code with new features:

- [ ] All user-facing text uses translation keys
- [ ] Keys added to both `es.json` and `en.json`
- [ ] No hardcoded Spanish or English text
- [ ] Toast/notification messages translated
- [ ] Form validation messages translated
- [ ] Empty states translated
- [ ] Loading states translated
- [ ] Error messages translated
- [ ] Tested in both Spanish and English
- [ ] No console warnings about missing keys

## Tools and Resources

**View all translations:**
- Check `messages/es.json` and `messages/en.json`

**Find missing translations:**
- Check browser console for warnings

**Test language switching:**
- Use language selector in profile menu
- Verify all text changes

## Need Help?

- Check existing modules for examples
- Follow the patterns in `common`, `validation`, and `notifications` sections
- Ask team if unsure about where to place a translation
