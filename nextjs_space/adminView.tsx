import React, { useState } from 'react';

const AdminDashboardPrototype = () => {
    const [viewMode, setViewMode] = useState('admin'); // 'admin' | 'seller'
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Stats data
    const stats = {
        todaySales: 15847.50,
        transactions: 47,
        lowStock: 12,
        pendingQuotes: 5
    };

    const recentSales = [
        { id: 'V-001247', time: '14:32', customer: 'María López', total: 458.00, status: 'completed' },
        { id: 'V-001246', time: '14:15', customer: 'Cliente General', total: 125.50, status: 'completed' },
        { id: 'V-001245', time: '13:58', customer: 'Juan Pérez', total: 892.00, status: 'completed' },
        { id: 'V-001244', time: '13:41', customer: 'Ana García', total: 234.75, status: 'pending' },
    ];

    const lowStockItems = [
        { name: 'Coca-Cola 600ml', current: 5, min: 20 },
        { name: 'Sabritas Original', current: 8, min: 15 },
        { name: 'Leche Lala 1L', current: 3, min: 10 },
    ];

    const menuItems = [
        { icon: 'dashboard', label: 'Panel', active: true },
        { icon: 'cart', label: 'Ventas', badge: null },
        { icon: 'package', label: 'Inventario', badge: 12 },
        { icon: 'users', label: 'Clientes', badge: null },
        { icon: 'file', label: 'Cotizaciones', badge: 5 },
        { icon: 'chart', label: 'Reportes', badge: null },
    ];

    const settingsItems = [
        { icon: 'building', label: 'Empresa' },
        { icon: 'users-cog', label: 'Equipo' },
        { icon: 'shield', label: 'Roles' },
    ];

    const renderIcon = (name: string, className = "w-5 h-5") => {
        const icons: Record<string, JSX.Element> = {
            dashboard: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
            cart: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
            package: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
            users: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
            file: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
            chart: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
            building: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
            'users-cog': <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
            shield: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
            switch: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>,
            menu: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>,
            bell: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
            settings: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
            logout: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
            arrowUp: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" /></svg>,
            arrowDown: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" /></svg>,
            warning: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
            clock: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
            location: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
        };
        return icons[name] || null;
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <div className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300`}>
                {/* Logo */}
                <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-emerald-200">
                            P
                        </div>
                        {!sidebarCollapsed && (
                            <div>
                                <div className="font-bold text-gray-800">Sistema POS</div>
                                <div className="text-xs text-gray-500">v2.0</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Location Selector */}
                {!sidebarCollapsed && (
                    <div className="p-3 border-b border-gray-100">
                        <button className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            {renderIcon('location', 'w-4 h-4 text-gray-500')}
                            <span className="text-sm font-medium text-gray-700 flex-1 text-left">JEREZ</span>
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Main Menu */}
                <nav className="flex-1 p-3 space-y-1">
                    <div className={`text-xs font-semibold text-gray-400 uppercase tracking-wider ${sidebarCollapsed ? 'text-center' : 'px-3'} mb-2`}>
                        {sidebarCollapsed ? '•••' : 'Menú Principal'}
                    </div>

                    {menuItems.map((item, index) => (
                        <button
                            key={index}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${item.active
                                    ? 'bg-emerald-50 text-emerald-700 font-medium'
                                    : 'text-gray-600 hover:bg-gray-50'
                                } ${sidebarCollapsed ? 'justify-center' : ''}`}
                        >
                            <span className={item.active ? 'text-emerald-600' : 'text-gray-400'}>
                                {renderIcon(item.icon)}
                            </span>
                            {!sidebarCollapsed && (
                                <>
                                    <span className="flex-1 text-left">{item.label}</span>
                                    {item.badge && (
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${item.icon === 'package'
                                                ? 'bg-orange-100 text-orange-700'
                                                : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {item.badge}
                                        </span>
                                    )}
                                </>
                            )}
                        </button>
                    ))}

                    <div className="pt-4">
                        <div className={`text-xs font-semibold text-gray-400 uppercase tracking-wider ${sidebarCollapsed ? 'text-center' : 'px-3'} mb-2`}>
                            {sidebarCollapsed ? '•••' : 'Configuración'}
                        </div>

                        {settingsItems.map((item, index) => (
                            <button
                                key={index}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 transition-all ${sidebarCollapsed ? 'justify-center' : ''}`}
                            >
                                <span className="text-gray-400">{renderIcon(item.icon)}</span>
                                {!sidebarCollapsed && <span className="flex-1 text-left">{item.label}</span>}
                            </button>
                        ))}
                    </div>
                </nav>

                {/* View Mode Switcher */}
                <div className="p-3 border-t border-gray-100">
                    <button
                        onClick={() => setViewMode(viewMode === 'admin' ? 'seller' : 'admin')}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${sidebarCollapsed ? 'justify-center' : ''
                            } ${viewMode === 'admin'
                                ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-200'
                                : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200'
                            }`}
                    >
                        {renderIcon('switch')}
                        {!sidebarCollapsed && (
                            <div className="flex-1 text-left">
                                <div className="text-sm font-medium">
                                    {viewMode === 'admin' ? 'Modo Admin' : 'Modo Vendedor'}
                                </div>
                                <div className="text-xs opacity-80">
                                    Cambiar a {viewMode === 'admin' ? 'vendedor' : 'admin'}
                                </div>
                            </div>
                        )}
                    </button>
                </div>

                {/* User Profile */}
                <div className="p-3 border-t border-gray-100">
                    <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium">
                            JA
                        </div>
                        {!sidebarCollapsed && (
                            <div className="flex-1">
                                <div className="font-medium text-gray-800 text-sm">Jesús Alejandro</div>
                                <div className="text-xs text-gray-500">Administrador</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {/* Top Header */}
                <header className="bg-white border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                {renderIcon('menu')}
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">¡Buenas noches, Jesús Alejandro!</h1>
                                <p className="text-gray-500 text-sm">Esto es lo que está pasando con tu tienda hoy</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Quick Actions */}
                            <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Nueva Venta
                            </button>

                            <button className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                {renderIcon('bell', 'w-6 h-6 text-gray-500')}
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                            </button>

                            <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                {renderIcon('settings', 'w-6 h-6 text-gray-500')}
                            </button>
                        </div>
                    </div>
                </header>

                {/* Dashboard Content */}
                <main className="flex-1 p-6 overflow-y-auto">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {/* Sales Today */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Ventas del Día</p>
                                    <p className="text-3xl font-bold text-gray-800 mt-1">
                                        ${stats.todaySales.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                    </p>
                                    <div className="flex items-center gap-1 mt-2 text-emerald-600">
                                        {renderIcon('arrowUp', 'w-4 h-4')}
                                        <span className="text-sm font-medium">+12.5%</span>
                                    </div>
                                </div>
                                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                                    <span className="text-2xl">💵</span>
                                </div>
                            </div>
                        </div>

                        {/* Transactions */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Transacciones</p>
                                    <p className="text-3xl font-bold text-gray-800 mt-1">{stats.transactions}</p>
                                    <div className="flex items-center gap-1 mt-2 text-emerald-600">
                                        {renderIcon('arrowUp', 'w-4 h-4')}
                                        <span className="text-sm font-medium">+8.2%</span>
                                    </div>
                                </div>
                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                    <span className="text-2xl">🛒</span>
                                </div>
                            </div>
                        </div>

                        {/* Low Stock */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Productos con Bajo Stock</p>
                                    <p className="text-3xl font-bold text-gray-800 mt-1">{stats.lowStock}</p>
                                    <p className="text-sm text-orange-600 font-medium mt-2">Requiere atención</p>
                                </div>
                                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                                    <span className="text-2xl">📦</span>
                                </div>
                            </div>
                        </div>

                        {/* Pending Quotes */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Cotizaciones Pendientes</p>
                                    <p className="text-3xl font-bold text-gray-800 mt-1">{stats.pendingQuotes}</p>
                                    <p className="text-sm text-purple-600 font-medium mt-2">En espera de acción</p>
                                </div>
                                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                    <span className="text-2xl">📋</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Charts and Tables Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        {/* Sales Chart */}
                        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="font-semibold text-gray-800">Resumen de Ventas</h3>
                                    <p className="text-sm text-gray-500">Últimos 7 días</p>
                                </div>
                                <select className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white">
                                    <option>Últimos 7 días</option>
                                    <option>Últimos 30 días</option>
                                    <option>Este mes</option>
                                </select>
                            </div>

                            {/* Simulated Chart */}
                            <div className="h-64 flex items-end justify-between gap-2 px-4">
                                {[65, 45, 78, 52, 88, 73, 95].map((height, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                        <div
                                            className="w-full bg-gradient-to-t from-emerald-500 to-teal-400 rounded-t-lg transition-all hover:from-emerald-600 hover:to-teal-500"
                                            style={{ height: `${height}%` }}
                                        ></div>
                                        <span className="text-xs text-gray-500">
                                            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][i]}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Top Products */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="font-semibold text-gray-800">Productos Más Vendidos</h3>
                                    <p className="text-sm text-gray-500">Este período</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {[
                                    { name: 'Coca-Cola 600ml', sales: 145, color: 'bg-red-500' },
                                    { name: 'Sabritas Original', sales: 98, color: 'bg-yellow-500' },
                                    { name: 'Pan Bimbo', sales: 76, color: 'bg-amber-600' },
                                    { name: 'Leche Lala 1L', sales: 64, color: 'bg-blue-500' },
                                ].map((product, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${product.color}`}></div>
                                        <div className="flex-1">
                                            <div className="flex justify-between text-sm">
                                                <span className="font-medium text-gray-700">{product.name}</span>
                                                <span className="text-gray-500">{product.sales} uds</span>
                                            </div>
                                            <div className="mt-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${product.color} rounded-full`}
                                                    style={{ width: `${(product.sales / 145) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Recent Sales */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="font-semibold text-gray-800">Ventas Recientes</h3>
                                    <p className="text-sm text-gray-500">Últimas transacciones</p>
                                </div>
                                <button className="text-sm text-emerald-600 font-medium hover:text-emerald-700">
                                    Ver todas →
                                </button>
                            </div>

                            <div className="space-y-3">
                                {recentSales.map((sale, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${sale.status === 'completed' ? 'bg-emerald-100' : 'bg-yellow-100'
                                                }`}>
                                                {sale.status === 'completed' ? '✓' : '⏳'}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-800">{sale.id}</div>
                                                <div className="text-sm text-gray-500">{sale.customer}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-semibold text-gray-800">${sale.total.toFixed(2)}</div>
                                            <div className="text-xs text-gray-500">{sale.time}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Low Stock Alert */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                                        {renderIcon('warning', 'w-5 h-5 text-orange-600')}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-800">Alertas de Inventario</h3>
                                        <p className="text-sm text-gray-500">Productos por agotarse</p>
                                    </div>
                                </div>
                                <button className="text-sm text-emerald-600 font-medium hover:text-emerald-700">
                                    Ver inventario →
                                </button>
                            </div>

                            <div className="space-y-3">
                                {lowStockItems.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-100">
                                        <div>
                                            <div className="font-medium text-gray-800">{item.name}</div>
                                            <div className="text-sm text-gray-500">
                                                Mínimo: {item.min} unidades
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-orange-600">{item.current}</div>
                                            <div className="text-xs text-orange-500">disponibles</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button className="w-full mt-4 py-2.5 bg-orange-100 hover:bg-orange-200 text-orange-700 font-medium rounded-xl transition-colors">
                                Crear Orden de Compra
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminDashboardPrototype;
/*
```

## Vista Administrador - Prototipo

He creado el prototipo de la vista de administrador con las siguientes características:

### Elementos Clave:

**1. Sidebar Completo**
- Navegación completa (Panel, Ventas, Inventario, Clientes, Cotizaciones, Reportes)
- Sección de Configuración (Empresa, Equipo, Roles)
- Selector de ubicación/sucursal
- **Botón de cambio de modo** (Admin ↔ Vendedor) - destacado en color

**2. Header Superior**
- Saludo personalizado con nombre del usuario
- Botón prominente "Nueva Venta"
- Notificaciones y configuración rápida

**3. Dashboard con Métricas**
- 4 tarjetas de estadísticas principales
- Gráfico de ventas de los últimos 7 días
- Productos más vendidos
- Ventas recientes
- Alertas de inventario bajo

**4. Botón de Cambio de Modo**
- Ubicado en el sidebar, siempre visible
- Color diferenciado (violeta para Admin, verde para Vendedor)
- Un clic cambia instantáneamente a la vista simplificada de vendedor

### Flujo de Cambio de Vista:
```
Admin Dashboard (completo)
        ↓
[Click en "Cambiar a vendedor"]
        ↓
POS Simplificado (vista vendedor)
        ↓
[Click en "Cambiar a admin"]
        ↓
Admin Dashboard (completo)*/