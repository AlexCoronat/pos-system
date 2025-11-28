/**
 * Category Tabs Component
 * Filter products by category
 */

'use client'

import { useEffect, useState } from 'react'
import { posService, type Category } from '@/lib/services/pos.service'

interface CategoryTabsProps {
    selectedCategory: number | null
    onCategoryChange: (categoryId: number | null) => void
}

export function CategoryTabs({ selectedCategory, onCategoryChange }: CategoryTabsProps) {
    const [categories, setCategories] = useState<Category[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        loadCategories()
    }, [])

    const loadCategories = async () => {
        setIsLoading(true)
        const data = await posService.getCategories()
        setCategories(data)
        setIsLoading(false)
    }

    if (isLoading) {
        return (
            <div className="flex gap-2 overflow-x-auto pb-2">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse" />
                ))}
            </div>
        )
    }

    return (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {/* All Products Tab */}
            <button
                onClick={() => onCategoryChange(null)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${selectedCategory === null
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
            >
                Todos
            </button>

            {/* Category Tabs */}
            {categories.map((category) => (
                <button
                    key={category.id}
                    onClick={() => onCategoryChange(category.id)}
                    className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${selectedCategory === category.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    {category.name}
                </button>
            ))}
        </div>
    )
}
