/**
 * Keyboard Shortcuts Settings Page
 * Configure keyboard shortcuts
 */

'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { KeyboardShortcutsSettings } from '@/components/settings/KeyboardShortcutsSettings'

export default function KeyboardShortcutsPage() {
    const router = useRouter()

    return (
        <div className="p-6">
            <div className="flex items-center gap-4 mb-6">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/dashboard/settings')}
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </div>
            <KeyboardShortcutsSettings />
        </div>
    )
}
