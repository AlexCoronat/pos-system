# Formatting Guide

## Overview

This guide explains how to format dates, numbers, and currency in a locale-aware manner using the utility functions in `lib/utils/formatters.ts`.

## Quick Start

```tsx
import { useFormatters } from '@/lib/utils/formatters'

function MyComponent() {
  const { formatDate, formatCurrency, formatNumber } = useFormatters()
  
  return (
    <div>
      <span>{formatDate(new Date())}</span>
      <span>{formatCurrency(1234.56)}</span>
      <span>{formatNumber(1000, 0)}</span>
    </div>
  )
}
```

## Available Formatters

### Date Formatting

#### `formatDate(date, options?)`

Formats a date according to the current locale.

```tsx
const { formatDate } = useFormatters()

// Default format
formatDate(new Date('2024-11-25'))
// Spanish: "25/11/2024"
// English: "11/25/2024"

// Custom format  
formatDate(new Date(), {
  month: 'long',
  day: 'numeric',
  year: 'numeric'
})
// Spanish: "25 de noviembre de 2024"
// English: "November 25, 2024"
```

#### `formatDateTime(date, use24Hour?)`

Formats date with time.

```tsx
const { formatDateTime } = useFormatters()

formatDateTime(new Date())
// Spanish: "25/11/2024, 14:30"
// English: "11/25/2024, 2:30 PM"
```

#### `formatTime(date, use24Hour?)`

Formats time only.

```tsx
const { formatTime } = useFormatters()

formatTime(new Date())
// Spanish: "14:30"
formatTime(new Date(), false)
// English: "2:30 PM"
```

#### `formatDateRange(startDate, endDate)`

Formats a date range.

```tsx
const { formatDateRange } = useFormatters()

formatDateRange(new Date('2024-11-25'), new Date('2024-11-30'))
// Spanish: "25/11/2024 - 30/11/2024"
// English: "11/25/2024 - 11/30/2024"
```

#### `formatRelativeTime(date)`

Formats relative time (e.g., "2 hours ago").

```tsx
const { formatRelativeTime } = useFormatters()

formatRelativeTime(new Date(Date.now() - 2 * 60 * 60 * 1000))
// Spanish: "hace 2 horas"
// English: "2 hours ago"
```

### Number Formatting

#### `formatNumber(value, decimals?)`

Formats numbers with proper thousand/decimal separators.

```tsx
const { formatNumber } = useFormatters()

formatNumber(1234.56)
// Spanish: "1.234,56"
// English: "1,234.56"

formatNumber(1000, 0)
// Spanish: "1.000"
// English: "1,000"
```

### Currency Formatting

#### `formatCurrency(amount)`

Formats Mexican Peso (MXN) amounts.

```tsx
const { formatCurrency } = useFormatters()

formatCurrency(1234.56)
// Spanish: "$1.234,56"
// English: "$1,234.56"

formatCurrency(-500)
// Spanish: "-$500,00"
// English: "-$500.00"
```

### Percentage Formatting

#### `formatPercentage(value, decimals?)`

Formats percentages (value should be decimal, e.g., 0.25 for 25%).

```tsx
const { formatPercentage } = useFormatters()

formatPercentage(0.2556)
// Spanish: "25,56%"
// English: "25.56%"

formatPercentage(0.5, 0)
// Spanish: "50%"
// English: "50%"
```

## Format Specifications

### Date Formats by Locale

| Type | Spanish (es) | English (en) |
|------|-------------|-------------|
| Short | 25/11/2024 | 11/25/2024 |
| Medium | 25 nov 2024 | Nov 25, 2024 |
| Long | 25 de noviembre de 2024 | November 25, 2024 |
| DateTime | 25/11/2024, 14:30 | 11/25/2024, 2:30 PM |
| Time 24h | 14:30 | 14:30 |
| Time 12h | 2:30 PM | 2:30 PM |

### Number Formats by Locale

| Value | Spanish (es) | English (en) |
|-------|-------------|-------------|
| 1234.56 | 1.234,56 | 1,234.56 |
| 1000000 | 1.000.000,00 | 1,000,000.00 |
| 0.2556 (25.56%) | 25,56% | 25.56% |

### Currency Format (MXN)

| Amount | Spanish (es) | English (en) |
|--------|-------------|-------------|
| 1234.56 | $1.234,56 | $1,234.56 |
| -500 | -$500,00 | -$500.00 |
| 0 | $0,00 | $0.00 |

## Usage in Different Contexts

### In React Client Components

```tsx
'use client'

import { useFormatters } from '@/lib/utils/formatters'

export function ProductCard({ product }) {
  const { formatCurrency, formatNumber } = useFormatters()
  
  return (
    <div>
      <h3>{product.name}</h3>
      <p>Price: {formatCurrency(product.price)}</p>
      <p>Stock: {formatNumber(product.stock, 0)} units</p>
    </div>
  )
}
```

### In Server Components

```tsx
import { formatDate, formatCurrency } from '@/lib/utils/formatters'

export async function OrderList({ locale }) {
  const orders = await getOrders()
  
  return (
    <div>
      {orders.map(order => (
        <div key={order.id}>
          <span>{formatDate(order.created_at, locale)}</span>
          <span>{formatCurrency(order.total, locale)}</span>
        </div>
      ))}
    </div>
  )
}
```

### In Data Tables

```tsx
const columns = [
  {
    accessorKey: 'created_at',
    header: t('date'),
    cell: ({ row }) => formatDate(row.getValue('created_at'))
  },
  {
    accessorKey: 'total',
    header: t('total'),
    cell: ({ row }) => formatCurrency(row.getValue('total'))
  }
]
```

### In Forms (Display Only)

```tsx
<div>
  <Label>Created At</Label>
  <p>{formatDateTime(order.created_at)}</p>
</div>

<div>
  <Label>Total</Label>
  <p className="text-2xl font-bold">{formatCurrency(order.total)}</p>
</div>
```

## Best Practices

### ✅ DO

- Always use formatters for user-facing dates, numbers, and currency
- Use the `useFormatters()` hook in React components
- Pass locale explicitly in server components
- Handle null/undefined values before formatting
- Use appropriate decimal places (0 for quantities, 2 for prices)

### ❌ DON'T

- Don't use `toFixed()` or manual string formatting
- Don't hardcode date formats like `${day}/${month}/${year}`
- Don't use `.toLocaleString()` directly (use formatters instead)
- Don't forget to import the formatters
- Don't mix formatting approaches

## Common Scenarios

### Display Product Price
```tsx
const { formatCurrency } = useFormatters()
<span className="text-lg font-bold">{formatCurrency(product.price)}</span>
```

### Display Order Date
```tsx
const { formatDate } = useFormatters()
<span className="text-sm text-gray-600">{formatDate(order.created_at)}</span>
```

### Display Stock Quantity
```tsx
const { formatNumber } = useFormatters()
<span>{formatNumber(product.stock, 0)} units</span>
```

### Display Discount Percentage
```tsx
const { formatPercentage } = useFormatters()
<Badge>{formatPercentage(product.discount)}</Badge>
```

### Display Last Activity
```tsx
const { formatRelativeTime } = useFormatters()
<span>{formatRelativeTime(user.last_login)}</span>
```

### Display Date Range in Reports
```tsx
const { formatDateRange } = useFormatters()
<h3>{formatDateRange(report.start_date, report.end_date)}</h3>
```

## Edge Cases

### Handling Null/Undefined
All formatters return empty string for null/undefined:

```tsx
formatDate(null) // ""
formatCurrency(undefined) // ""
formatNumber(null) // ""
```

### Invalid Dates
Invalid dates return empty string:

```tsx
formatDate('invalid') // ""
formatDateTime(new Date('bad date')) // ""
```

### Negative Numbers and Currency
Properly handles negative values:

```tsx
formatNumber(-100) // Spanish: "-100,00"
formatCurrency(-50.50) // Spanish: "-$50,50"
```

## TypeScript Support

All formatters have full TypeScript definitions:

```typescript
formatDate(date: Date | string, locale?: string, options?: Intl.DateTimeFormatOptions): string
formatNumber(value: number, locale?: string, decimals?: number): string
formatCurrency(amount: number, locale?: string): string
```

## Performance

- Formatters use native `Intl` API (no external dependencies)
- Memoization not needed (Intl API is fast)
- Safe to use in render methods
- Works in all modern browsers

## Migration from Old Code

If you have existing code with manual formatting:

```tsx
// ❌ Old way
const formattedPrice = `$${price.toFixed(2)}`
const formattedDate = `${day}/${month}/${year}`

// ✅ New way
const { formatCurrency, formatDate } = useFormatters()
const formattedPrice = formatCurrency(price)
const formattedDate = formatDate(date)
```

## Need Help?

- Check `lib/utils/formatters.ts` for implementation details
- See examples in existing components (sales, inventory, customers)
- Ask team if you're unsure which formatter to use
