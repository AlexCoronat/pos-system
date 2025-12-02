/**
 * Updated Dashboard Layout
 * Uses the new AdminLayout component with BrandingProvider for dynamic theming
 */

import { AdminLayout } from '@/components/admin/AdminLayout'
import { BrandingProvider } from '@/lib/contexts/BrandingContext'

export default function DashboardLayoutPage({ children }: { children: React.ReactNode }) {
  return (
    <BrandingProvider>
      <AdminLayout>{children}</AdminLayout>
    </BrandingProvider>
  )
}
