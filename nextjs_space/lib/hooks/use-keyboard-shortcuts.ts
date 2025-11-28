/**
 * Keyboard Shortcuts Hook
 * Global hook for managing keyboard shortcuts
 */

import { useEffect, useCallback } from 'react'

export interface ShortcutConfig {
    key: string
    ctrl?: boolean
    alt?: boolean
    shift?: boolean
    meta?: boolean
    description?: string
    handler: (event: KeyboardEvent) => void
    enabled?: boolean
    preventDefault?: boolean
}

interface UseKeyboardShortcutsOptions {
    shortcuts: ShortcutConfig[]
    enabled?: boolean
    /** Don't trigger shortcuts when typing in inputs/textareas */
    ignoreInputs?: boolean
}

export function useKeyboardShortcuts({
    shortcuts,
    enabled = true,
    ignoreInputs = true
}: UseKeyboardShortcutsOptions) {
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        // Skip if disabled
        if (!enabled) return

        // Skip if typing in input/textarea (unless explicitly allowed)
        if (ignoreInputs) {
            const target = event.target as HTMLElement
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                return
            }
        }

        // Find matching shortcut
        for (const shortcut of shortcuts) {
            if (shortcut.enabled === false) continue

            // Check key match (case insensitive)
            const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()

            // Check modifiers
            const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey
            const altMatch = shortcut.alt ? event.altKey : !event.altKey
            const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey

            if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
                if (shortcut.preventDefault !== false) {
                    event.preventDefault()
                }
                shortcut.handler(event)
                break // Only trigger first matching shortcut
            }
        }
    }, [shortcuts, enabled, ignoreInputs])

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleKeyDown])
}

/**
 * Simple shortcut hook for single key press
 */
export function useKeyPress(key: string, handler: () => void, enabled = true) {
    useKeyboardShortcuts({
        shortcuts: [{
            key,
            handler,
            enabled
        }],
        enabled
    })
}

/**
 * ESC key hook - commonly used for closing modals
 */
export function useEscapeKey(handler: () => void, enabled = true) {
    useKeyPress('Escape', handler, enabled)
}
