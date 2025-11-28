/**
 * Keyboard Shortcuts Settings
 * UI for customizing keyboard shortcuts
 */

'use client'

import { useState } from 'react'
import { useShortcutsStore } from '@/lib/stores/shortcuts-store'
import { Keyboard, RotateCcw, Check, X } from 'lucide-react'

export function KeyboardShortcutsSettings() {
    const { shortcuts, setShortcut, resetShortcut, resetAllShortcuts, toggleShortcut } = useShortcutsStore()
    const [editingId, setEditingId] = useState<string | null>(null)
    const [newKey, setNewKey] = useState('')

    const handleKeyPress = (e: React.KeyboardEvent) => {
        e.preventDefault()

        let key = e.key
        if (key === ' ') key = 'Space'
        if (key === 'Control') key = 'Ctrl'
        if (key === 'Meta') key = 'Cmd'

        setNewKey(key)
    }

    const saveShortcut = (id: string) => {
        if (!newKey) return

        setShortcut(id, { key: newKey })
        setEditingId(null)
        setNewKey('')
    }

    const cancelEdit = () => {
        setEditingId(null)
        setNewKey('')
    }

    const categories = {
        pos: 'Punto de Venta',
        global: 'Global',
        navigation: 'Navegación'
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Atajos de Teclado</h3>
                    <p className="text-sm text-gray-600">Personaliza los atajos para mejorar tu flujo de trabajo</p>
                </div>
                <button
                    onClick={resetAllShortcuts}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                    <RotateCcw className="w-4 h-4" />
                    Restablecer Todo
                </button>
            </div>

            {/* Shortcuts by Category */}
            {Object.entries(categories).map(([category, label]) => {
                const categoryShortcuts = shortcuts.filter(s => s.category === category)
                if (categoryShortcuts.length === 0) return null

                return (
                    <div key={category} className="space-y-3">
                        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                            {label}
                        </h4>
                        <div className="bg-white border border-gray-200 rounded-lg divide-y">
                            {categoryShortcuts.map((shortcut) => (
                                <div
                                    key={shortcut.id}
                                    className="p-4 flex items-center justify-between hover:bg-gray-50"
                                >
                                    <div className="flex items-center gap-3 flex-1">
                                        <input
                                            type="checkbox"
                                            checked={shortcut.enabled}
                                            onChange={() => toggleShortcut(shortcut.id)}
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {shortcut.description}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                ID: {shortcut.id}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {editingId === shortcut.id ? (
                                            <>
                                                <input
                                                    type="text"
                                                    value={newKey}
                                                    onKeyDown={handleKeyPress}
                                                    placeholder="Presiona una tecla..."
                                                    className="px-3 py-1 border border-blue-500 rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => saveShortcut(shortcut.id)}
                                                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                    title="Guardar"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={cancelEdit}
                                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                    title="Cancelar"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <kbd className="px-3 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono text-gray-700">
                                                    {shortcut.ctrl && 'Ctrl + '}
                                                    {shortcut.alt && 'Alt + '}
                                                    {shortcut.shift && 'Shift + '}
                                                    {shortcut.key}
                                                </kbd>
                                                <button
                                                    onClick={() => {
                                                        setEditingId(shortcut.id)
                                                        setNewKey(shortcut.key)
                                                    }}
                                                    className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => resetShortcut(shortcut.id)}
                                                    className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                                                    title="Restablecer"
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            })}

            {/* Help Text */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-2">
                    <Keyboard className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                        <p className="font-semibold mb-1">Consejos:</p>
                        <ul className="space-y-1 list-disc list-inside">
                            <li>Haz clic en "Editar" y presiona la tecla que deseas asignar</li>
                            <li>Las teclas de función (F1-F12) son ideales para atajos</li>
                            <li>Desactiva atajos que no uses para evitar conflictos</li>
                            <li>Usa "Restablecer" para volver a la configuración por defecto</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}
