# i18n Developer Checklist

## Before Submitting a Pull Request

Use this checklist when adding new features or modifying existing ones to ensure proper internationalization.

### Translation Keys

- [ ] All user-facing text uses translation keys (no hardcoded strings)
- [ ] Translation keys added to **both** `messages/es.json` and `messages/en.json`
- [ ] Keys follow naming conventions (camelCase, descriptive)
- [ ] Keys organized in appropriate section (module-specific or `common`)

### Component Implementation

- [ ] Imported `useTranslations` hook
- [ ] Used correct namespace for translations
- [ ] No Spanish or English text hardcoded in JSX
- [ ] No hardcoded text in attributes (`placeholder`, `title`, `aria-label`, etc.)

### Specific Elements

- [ ] Page titles and subtitles translated
- [ ] Button labels translated
- [ ] Form labels and placeholders translated
- [ ] Table headers translated
- [ ] Toast/notification messages translated
- [ ] Validation error messages translated
- [ ] Empty state messages translated
- [ ] Loading state messages translated
- [ ] Dialog/modal titles and descriptions translated
- [ ] Dropdown options translated
- [ ] Badge labels translated

### Formatting

- [ ] Dates formatted using `formatDate()` from formatters
- [ ] Currency formatted using `formatCurrency()`
- [ ] Numbers formatted using `formatNumber()`
- [ ] Times formatted using `formatTime()` or `formatDateTime()`
- [ ] No manual date/number formatting (`toFixed()`, string concatenation, etc.)

### Testing

- [ ] Tested feature in **Spanish** (es)
- [ ] Tested feature in **English** (en)
- [ ] Verified language switching works correctly
- [ ] No console warnings about missing translation keys
- [ ] No layout breaking with longer translations
- [ ] Responsive design maintained in both languages

### Edge Cases

- [ ] Null/undefined values handled gracefully
- [ ] Long text doesn't break layout (use `text-ellipsis` if needed)
- [ ] Pluralization handled correctly (1 item vs 2 items)
- [ ] Special characters display correctly
- [ ] Toast messages disappear after timeout

## Quick Reference

### Import Translations

```tsx
import { useTranslations } from 'next-intl'

const t = useTranslations('yourModule')
const tCommon = use Translations('common')
```

### Import Formatters

```tsx
import { useFormatters } from '@/lib/utils/formatters'

const { formatDate, formatCurrency, formatNumber } = useFormatters()
```

### Common Use Cases

```tsx
// Page title
<h1>{t('title')}</h1>

// Button
<Button>{tCommon('actions.save')}</Button>

// Form label
<Label>{t('form.name')}</Label>

// Placeholder
<Input placeholder={t('form.namePlaceholder')} />

// Toast message
toast.success(t('messages.created'))

// Empty state
<p>{t('empty.noItems')}</p>

// Date display
<span>{formatDate(item.created_at)}</span>

// Currency display
<span>{formatCurrency(product.price)}</span>
```

## Common Mistakes to Avoid

❌ **Hardcoded text**
```tsx
<Button>Save</Button>
```

✅ **Translated**
```tsx
const t = useTranslations('common.actions')
<Button>{t('save')}</Button>
```

---

❌ **Only one language**
```json
// Only added to es.json, forgot en.json
{
  "newKey": "Nuevo valor"
}
```

✅ **Both languages**
```json
// es.json
{ "newKey": "Nuevo valor" }

// en.json
{ "newKey": "New value" }
```

---

❌ **Manual formatting**
```tsx
<span>${price.toFixed(2)}</span>
```

✅ **Using formatters**
```tsx
const { formatCurrency } = useFormatters()
<span>{formatCurrency(price)}</span>
```

---

❌ **Hardcoded date format**
```tsx
<span>{day}/{month}/{year}</span>
```

✅ **Using formatters**
```tsx
const { formatDate } = useFormatters()
<span>{formatDate(date)}</span>
```

## Need Help?

- **Translations**: See [TRANSLATION_GUIDE.md](./TRANSLATION_GUIDE.md)
- **Formatting**: See [FORMATTING_GUIDE.md](./FORMATTING_GUIDE.md)
- **Examples**: Check existing modules (sales, inventory, customers)
- **Questions**: Ask the team in Slack/Discord

## Final Pre-Submit Check

Before submitting your PR, verify:

1. ✅ Ran application in Spanish
2. ✅ Ran application in English
3. ✅ Switched languages and verified all text changes
4. ✅ No console errors or warnings
5. ✅ All items in this checklist completed
