'use client'

import { useState } from 'react'
import { Plus, X, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import type { VariantAttribute } from '@/lib/types/product'

interface VariantAttributeBuilderProps {
    attributes: VariantAttribute[]
    onChange: (attributes: VariantAttribute[]) => void
}

// Common attribute suggestions for different business types
const ATTRIBUTE_SUGGESTIONS = [
    'Color',
    'Talla',
    'Tamaño',
    'Sabor',
    'Material',
    'Estilo',
    'Tipo',
    'Presentación',
    'Peso',
    'Capacidad'
]

export function VariantAttributeBuilder({ attributes, onChange }: VariantAttributeBuilderProps) {
    const [newValue, setNewValue] = useState<Record<number, string>>({})

    const addAttribute = () => {
        onChange([
            ...attributes,
            { name: '', values: [] }
        ])
    }

    const removeAttribute = (index: number) => {
        onChange(attributes.filter((_, i) => i !== index))
    }

    const updateAttributeName = (index: number, name: string) => {
        const updated = [...attributes]
        updated[index] = { ...updated[index], name }
        onChange(updated)
    }

    const addValue = (attributeIndex: number) => {
        const value = newValue[attributeIndex]?.trim()
        if (!value) return

        const updated = [...attributes]
        const values = updated[attributeIndex].values || []

        // Avoid duplicates
        if (!values.includes(value)) {
            updated[attributeIndex] = {
                ...updated[attributeIndex],
                values: [...values, value]
            }
            onChange(updated)
        }

        // Clear input
        setNewValue({ ...newValue, [attributeIndex]: '' })
    }

    const removeValue = (attributeIndex: number, valueIndex: number) => {
        const updated = [...attributes]
        updated[attributeIndex] = {
            ...updated[attributeIndex],
            values: updated[attributeIndex].values.filter((_, i) => i !== valueIndex)
        }
        onChange(updated)
    }

    const handleKeyPress = (e: React.KeyboardEvent, attributeIndex: number) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            addValue(attributeIndex)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-medium text-gray-900">Atributos de Variantes</h3>
                    <p className="text-xs text-gray-500 mt-1">
                        Define las características que varían del producto (ej: Color, Talla)
                    </p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAttribute}
                    className="gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Agregar Atributo
                </Button>
            </div>

            {attributes.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-sm text-gray-500">
                        No hay atributos definidos. Haz clic en "Agregar Atributo" para comenzar.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {attributes.map((attribute, attrIndex) => (
                        <div
                            key={attrIndex}
                            className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200"
                        >
                            {/* Attribute Name */}
                            <div className="flex items-start gap-2">
                                <div className="flex-1">
                                    <Label htmlFor={`attr-name-${attrIndex}`} className="text-xs">
                                        Nombre del Atributo
                                    </Label>
                                    <div className="relative mt-1">
                                        <Input
                                            id={`attr-name-${attrIndex}`}
                                            type="text"
                                            placeholder="Ej: Color, Talla, Sabor..."
                                            value={attribute.name}
                                            onChange={(e) => updateAttributeName(attrIndex, e.target.value)}
                                            list={`attr-suggestions-${attrIndex}`}
                                            className="pr-8"
                                        />
                                        <datalist id={`attr-suggestions-${attrIndex}`}>
                                            {ATTRIBUTE_SUGGESTIONS.map((suggestion) => (
                                                <option key={suggestion} value={suggestion} />
                                            ))}
                                        </datalist>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeAttribute(attrIndex)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 mt-6"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Attribute Values */}
                            <div>
                                <Label htmlFor={`attr-value-${attrIndex}`} className="text-xs">
                                    Valores
                                </Label>
                                <div className="flex gap-2 mt-1">
                                    <Input
                                        id={`attr-value-${attrIndex}`}
                                        type="text"
                                        placeholder="Ej: Rojo, Azul, Verde..."
                                        value={newValue[attrIndex] || ''}
                                        onChange={(e) =>
                                            setNewValue({ ...newValue, [attrIndex]: e.target.value })
                                        }
                                        onKeyPress={(e) => handleKeyPress(e, attrIndex)}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => addValue(attrIndex)}
                                        disabled={!newValue[attrIndex]?.trim()}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>

                                {/* Values List */}
                                {attribute.values.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {attribute.values.map((value, valueIndex) => (
                                            <Badge
                                                key={valueIndex}
                                                variant="secondary"
                                                className="gap-1 pr-1"
                                            >
                                                {value}
                                                <button
                                                    type="button"
                                                    onClick={() => removeValue(attrIndex, valueIndex)}
                                                    className="ml-1 hover:bg-gray-300 rounded-full p-0.5 transition-colors"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Combinations Preview */}
            {attributes.length > 0 && attributes.every(attr => attr.name && attr.values.length > 0) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-900">
                        <strong>Combinaciones posibles:</strong>{' '}
                        {attributes.reduce((total, attr) => total * attr.values.length, 1)} variantes
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                        Se generarán automáticamente todas las combinaciones de estos atributos
                    </p>
                </div>
            )}
        </div>
    )
}
