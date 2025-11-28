/**
 * Updated Dashboard Layout
 * Uses the new AdminLayout component
 */

import { AdminLayout } from '@/components/admin/AdminLayout'

export default function DashboardLayoutPage({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>
}
