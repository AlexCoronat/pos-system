/**
 * Keyboard Shortcuts Store
 * Manages user-customizable keyboard shortcuts
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ShortcutConfig {
    id: string
    key: string
    ctrl?: boolean
    alt?: boolean
    shift?: boolean
    description: string
    category: 'pos' | 'global' | 'navigation'
    enabled: boolean
}

interface ShortcutsState {
    shortcuts: ShortcutConfig[]
    setShortcut: (id: string, config: Partial<ShortcutConfig>) => void
    resetShortcut: (id: string) => void
    resetAllShortcuts: () => void
    toggleShortcut: (id: string) => void
}

const DEFAULT_SHORTCUTS: ShortcutConfig[] = [
    {
        id: 'search',
        key: 'F2',
        description: 'Enfocar búsqueda de productos',
        category: 'pos',
        enabled: true
    },
    {
        id: 'checkout',
        key: 'F12',
        description: 'Abrir modal de pago',
        category: 'pos',
        enabled: true
    },
    {
        id: 'clear_cart',
        key: 'Escape',
        description: 'Limpiar carrito',
        category: 'pos',
        enabled: true
    },
    {
        id: 'close_modal',
        key: 'Escape',
        description: 'Cerrar modales',
        category: 'global',
        enabled: true
    }
]

export const useShortcutsStore = create<ShortcutsState>()(
    persist(
        (set) => ({
            shortcuts: DEFAULT_SHORTCUTS,

            setShortcut: (id, config) =>
                set((state) => ({
                    shortcuts: state.shortcuts.map((shortcut) =>
                        shortcut.id === id
                            ? { ...shortcut, ...config }
                            : shortcut
                    )
                })),

            resetShortcut: (id) =>
                set((state) => ({
                    shortcuts: state.shortcuts.map((shortcut) =>
                        shortcut.id === id
                            ? DEFAULT_SHORTCUTS.find((s) => s.id === id) || shortcut
                            : shortcut
                    )
                })),

            resetAllShortcuts: () =>
                set({ shortcuts: DEFAULT_SHORTCUTS }),

            toggleShortcut: (id) =>
                set((state) => ({
                    shortcuts: state.shortcuts.map((shortcut) =>
                        shortcut.id === id
                            ? { ...shortcut, enabled: !shortcut.enabled }
                            : shortcut
                    )
                }))
        }),
        {
            name: 'keyboard-shortcuts-storage'
        }
    )
)
