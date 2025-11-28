import React, { useState } from 'react';

const POSSimplifiedPrototype = () => {
    const [cart, setCart] = useState([
        { id: 1, name: 'Coca-Cola 600ml', price: 18.00, qty: 2 },
        { id: 2, name: 'Sabritas Original', price: 22.50, qty: 1 },
        { id: 3, name: 'Pan Bimbo Grande', price: 45.00, qty: 1 },
    ]);

    const [searchFocused, setSearchFocused] = useState(false);

    const quickProducts = [
        { id: 1, name: 'Coca-Cola', price: 18, emoji: '🥤', color: 'bg-red-500' },
        { id: 2, name: 'Sabritas', price: 22.5, emoji: '🍟', color: 'bg-yellow-500' },
        { id: 3, name: 'Agua 1L', price: 15, emoji: '💧', color: 'bg-blue-500' },
        { id: 4, name: 'Pan Bimbo', price: 45, emoji: '🍞', color: 'bg-amber-600' },
        { id: 5, name: 'Leche 1L', price: 28, emoji: '🥛', color: 'bg-gray-100' },
        { id: 6, name: 'Huevos 12', price: 52, emoji: '🥚', color: 'bg-orange-200' },
        { id: 7, name: 'Jamón 200g', price: 38, emoji: '🥓', color: 'bg-pink-400' },
        { id: 8, name: 'Queso 250g', price: 65, emoji: '🧀', color: 'bg-yellow-300' },
    ];

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const tax = subtotal * 0.16;
    const total = subtotal + tax;

    return (
        <div className="min-h-screen bg-gray-100 flex">
            {/* Barra lateral mínima */}
            <div className="w-16 bg-gray-900 flex flex-col items-center py-4 gap-4">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                    P
                </div>

                <div className="flex-1 flex flex-col gap-2 mt-4">
                    <button className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white hover:bg-emerald-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </button>

                    <button className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>

                    <button className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </button>
                </div>

                <button className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 hover:bg-red-600 hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>
            </div>

            {/* Área principal - Productos */}
            <div className="flex-1 p-4 flex flex-col">
                {/* Header con búsqueda */}
                <div className="mb-4">
                    <div className="flex items-center gap-4">
                        <div className={`flex-1 relative transition-all ${searchFocused ? 'scale-[1.02]' : ''}`}>
                            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Buscar producto o escanear código de barras..."
                                className="w-full pl-12 pr-4 py-4 text-lg rounded-2xl border-2 border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition-all"
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setSearchFocused(false)}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                                <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-500 font-mono">F2</span>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="text-sm text-gray-500">Sucursal</div>
                            <div className="font-semibold text-gray-800">JEREZ - Central</div>
                        </div>
                    </div>
                </div>

                {/* Productos Rápidos */}
                <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">Acceso Rápido</h3>
                    <div className="grid grid-cols-4 gap-3">
                        {quickProducts.map((product) => (
                            <button
                                key={product.id}
                                className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all border-2 border-transparent hover:border-emerald-400 group"
                            >
                                <div className={`w-12 h-12 ${product.color} rounded-xl flex items-center justify-center text-2xl mb-2 mx-auto group-hover:scale-110 transition-transform`}>
                                    {product.emoji}
                                </div>
                                <div className="text-sm font-medium text-gray-800 truncate">{product.name}</div>
                                <div className="text-emerald-600 font-bold">${product.price.toFixed(2)}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Categorías */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                    {['Todos', 'Bebidas', 'Snacks', 'Lácteos', 'Panadería', 'Carnes', 'Abarrotes', 'Limpieza'].map((cat, i) => (
                        <button
                            key={cat}
                            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${i === 0
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                                    : 'bg-white text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Teclado numérico flotante (indicador) */}
                <div className="mt-auto pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex gap-4">
                            <span><span className="font-mono bg-gray-100 px-2 py-1 rounded">F1</span> Ayuda</span>
                            <span><span className="font-mono bg-gray-100 px-2 py-1 rounded">F3</span> Cliente</span>
                            <span><span className="font-mono bg-gray-100 px-2 py-1 rounded">F8</span> Descuento</span>
                            <span><span className="font-mono bg-gray-100 px-2 py-1 rounded">ESC</span> Cancelar</span>
                        </div>
                        <div className="text-gray-800 font-medium">
                            Cajero: <span className="text-emerald-600">María García</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Panel del Carrito */}
            <div className="w-96 bg-white shadow-2xl flex flex-col">
                {/* Header del carrito */}
                <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-800">Venta Actual</h2>
                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium">
                            {cart.length} items
                        </span>
                    </div>
                    <div className="mt-2 flex gap-2">
                        <button className="flex-1 py-2 px-3 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition-colors">
                            + Cliente
                        </button>
                        <button className="flex-1 py-2 px-3 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition-colors">
                            Notas
                        </button>
                    </div>
                </div>

                {/* Lista de productos */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.map((item) => (
                        <div key={item.id} className="bg-gray-50 rounded-xl p-3 group hover:bg-gray-100 transition-colors">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="font-medium text-gray-800">{item.name}</div>
                                    <div className="text-sm text-gray-500">${item.price.toFixed(2)} c/u</div>
                                </div>
                                <button className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all p-1">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-2">
                                    <button className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                        </svg>
                                    </button>
                                    <span className="w-10 text-center font-bold text-lg">{item.qty}</span>
                                    <button className="w-8 h-8 rounded-lg bg-emerald-500 text-white shadow-sm flex items-center justify-center hover:bg-emerald-600 transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="font-bold text-gray-800">
                                    ${(item.price * item.qty).toFixed(2)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Totales */}
                <div className="border-t border-gray-100 p-4 space-y-2">
                    <div className="flex justify-between text-gray-600">
                        <span>Subtotal</span>
                        <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                        <span>IVA (16%)</span>
                        <span>${tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-2xl font-bold text-gray-800 pt-2 border-t border-gray-200">
                        <span>Total</span>
                        <span className="text-emerald-600">${total.toFixed(2)}</span>
                    </div>
                </div>

                {/* Botones de acción */}
                <div className="p-4 space-y-3">
                    <button className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white text-xl font-bold rounded-2xl shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-300 transition-all flex items-center justify-center gap-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        COBRAR
                        <span className="font-mono bg-white/20 px-2 py-1 rounded text-sm">F12</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                        <button className="py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-all">
                            Pausar
                        </button>
                        <button className="py-3 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-xl transition-all">
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default POSSimplifiedPrototype;