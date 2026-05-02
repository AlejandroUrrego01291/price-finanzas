'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    Cell, LineChart, Line
} from 'recharts'

type Transaccion = {
    id: string
    type: string
    conceptName: string
    value: number
    date: string
    category: string | null
    subType: string | null
    completed: boolean
    concept: {
        id: string
        name: string
        category: string | null
        subType: string | null
    } | null
}

type Props = {
    transacciones: Transaccion[]
    mesesDisponibles: string[]
    primerNombre: string
}

const NavButton = ({ href, icon, text, color }: { href: string; icon: string; text: string; color: string }) => {
    const colorClasses = {
        blue: 'hover:bg-blue-50 hover:text-blue-600 border-blue-200',
        green: 'hover:bg-green-50 hover:text-green-600 border-green-200',
        red: 'hover:bg-red-50 hover:text-red-600 border-red-200',
        yellow: 'hover:bg-yellow-50 hover:text-yellow-600 border-yellow-200',
        purple: 'hover:bg-purple-50 hover:text-purple-600 border-purple-200',
    }

    return (
        <Link
            href={href}
            className={`px-4 py-2 text-gray-700 font-medium rounded-full ${colorClasses[color as keyof typeof colorClasses]} transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-md flex items-center space-x-2 border border-transparent hover:border-current`}
        >
            <span className="text-lg">{icon}</span>
            <span>{text}</span>
        </Link>
    )
}

export default function DashboardClient({ transacciones, mesesDisponibles, primerNombre }: Props) {
    const router = useRouter()

    // 🔥 Calcular fechas por defecto: primer y último día del mes actual
    const hoy = new Date()
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
    const primerDiaStr = primerDiaMes.toISOString().split('T')[0]
    const ultimoDiaStr = ultimoDiaMes.toISOString().split('T')[0]

    const [fechaDesde, setFechaDesde] = useState<string>(primerDiaStr)
    const [fechaHasta, setFechaHasta] = useState<string>(ultimoDiaStr)
    const [categoriaExpandida, setCategoriaExpandida] = useState<string | null>(null)
    const [menuAbierto, setMenuAbierto] = useState(false)

    // 🔥 Filtrar transacciones por rango de fechas (DESDE - HASTA)
    const transaccionesFiltradas = useMemo(() => {
        if (!fechaDesde || !fechaHasta) return transacciones
        const desde = new Date(fechaDesde)
        const hasta = new Date(fechaHasta)
        hasta.setHours(23, 59, 59, 999)
        return transacciones.filter(t => {
            const fechaTransaccion = new Date(t.date)
            return fechaTransaccion >= desde && fechaTransaccion <= hasta
        })
    }, [transacciones, fechaDesde, fechaHasta])

    const totales = useMemo(() => {
        const ingresos = transaccionesFiltradas.filter(t => t.type === 'INGRESO').reduce((sum, t) => sum + t.value, 0)
        const gastos = transaccionesFiltradas.filter(t => t.type === 'GASTO').reduce((sum, t) => sum + t.value, 0)
        return { ingresos, gastos, balance: ingresos - gastos }
    }, [transaccionesFiltradas])

    const datosBarra = useMemo(() => ([
        { name: 'Ingresos', valor: totales.ingresos, fill: '#10B981' },
        { name: 'Gastos', valor: totales.gastos, fill: '#EF4444' }
    ]), [totales])

    const ingresosConDetalle = useMemo(() =>
        transaccionesFiltradas
            .filter(t => t.type === 'INGRESO')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        , [transaccionesFiltradas])

    const gastosPorCategoriaConDetalle = useMemo(() => {
        const map: { [key: string]: { total: number, transacciones: Transaccion[] } } = {}
        transaccionesFiltradas.filter(t => t.type === 'GASTO').forEach(t => {
            const cat = t.category || 'Sin categoría'
            if (!map[cat]) map[cat] = { total: 0, transacciones: [] }
            map[cat].total += t.value
            map[cat].transacciones.push(t)
        })
        Object.keys(map).forEach(cat => {
            map[cat].transacciones.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        })
        return Object.entries(map)
            .map(([categoria, data]) => ({ categoria, total: data.total, transacciones: data.transacciones }))
            .sort((a, b) => b.total - a.total)
    }, [transaccionesFiltradas])

    const datosGastosPorCategoria = useMemo(() =>
        gastosPorCategoriaConDetalle.map(item => ({ name: item.categoria, value: item.total }))
        , [gastosPorCategoriaConDetalle])

    const evolucionMensual = useMemo(() => {
        return mesesDisponibles.slice(0, 6).reverse().map(mes => {
            const [año, mesNum] = mes.split('-')
            const txsMes = transacciones.filter(t => {
                const f = new Date(t.date)
                return f.getFullYear() === Number(año) && f.getMonth() + 1 === Number(mesNum)
            })
            const ingresos = txsMes.filter(t => t.type === 'INGRESO').reduce((s, t) => s + t.value, 0)
            const gastos = txsMes.filter(t => t.type === 'GASTO').reduce((s, t) => s + t.value, 0)
            const fecha = new Date(Number(año), Number(mesNum) - 1)
            return { mes: fecha.toLocaleDateString('es-CO', { month: 'short' }), ingresos, gastos }
        })
    }, [transacciones, mesesDisponibles])

    const handleEdit = (id: string) => router.push(`/transacciones?edit=${id}`)

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta transacción?')) return
        try {
            const response = await fetch(`/api/transacciones?id=${id}`, { method: 'DELETE' })
            if (response.ok) router.refresh()
        } catch (error) { console.error('Error:', error) }
    }

    const handleToggleCompleted = async (id: string, currentCompleted: boolean) => {
        try {
            const response = await fetch(`/api/transacciones?id=${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: !currentCompleted })
            })
            if (response.ok) router.refresh()
        } catch (error) { console.error('Error:', error) }
    }

    const formatearMoneda = (valor: number) => new Intl.NumberFormat('es-CO', {
        style: 'currency', currency: 'COP', minimumFractionDigits: 0
    }).format(valor)

    const formatearFecha = (fecha: string) => new Date(fecha).toLocaleDateString('es-CO', {
        year: 'numeric', month: 'short', day: 'numeric'
    })

    const coloresCategorias = [
        'bg-blue-500', 'bg-teal-500', 'bg-yellow-400', 'bg-orange-500',
        'bg-red-400', 'bg-purple-400', 'bg-pink-400', 'bg-indigo-400',
        'bg-green-400', 'bg-cyan-400', 'bg-lime-400', 'bg-amber-400'
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Navbar (sin cambios) */}
            <nav className="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-50 border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        <div className="flex items-center">
                            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                Mis finanzas
                            </h1>
                        </div>

                        {/* Menú escritorio */}
                        <div className="hidden md:flex items-center space-x-2">
                            <NavButton href="/transacciones" icon="💰" text="Registrar Ingreso/Gasto" color="blue" />
                            <NavButton href="/conceptos" icon="📁" text="Conceptos" color="green" />
                            <NavButton href="/deudas" icon="💳" text="Deudas" color="red" />
                            <NavButton href="/ahorros" icon="🐷" text="Ahorros" color="yellow" />
                            <NavButton href="/predicciones" icon="🔮" text="Predicciones" color="purple" />
                            <Link
                                href="/api/auth/signout"
                                className="px-5 py-2.5 text-sm font-medium text-red-600 hover:text-white border-2 border-red-600 rounded-full hover:bg-red-600 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg flex items-center space-x-2"
                            >
                                <span>🚪</span>
                                <span>Salir</span>
                            </Link>
                        </div>

                        {/* Menú móvil */}
                        <div className="md:hidden flex items-center space-x-2">
                            <Link href="/api/auth/signout" className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Cerrar sesión">
                                <span className="text-xl">🚪</span>
                            </Link>
                            <button onClick={() => setMenuAbierto(!menuAbierto)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {menuAbierto
                                        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    }
                                </svg>
                            </button>
                        </div>
                    </div>

                    {menuAbierto && (
                        <div className="md:hidden absolute left-0 right-0 bg-white/95 backdrop-blur-md shadow-lg border-t border-gray-200 py-2 z-50">
                            <div className="max-w-7xl mx-auto px-4">
                                {[
                                    { href: '/transacciones', icon: '💰', label: 'Registrar Ingreso/Gasto', hover: 'hover:bg-blue-50 hover:text-blue-600' },
                                    { href: '/conceptos', icon: '📁', label: 'Conceptos', hover: 'hover:bg-green-50 hover:text-green-600' },
                                    { href: '/deudas', icon: '💳', label: 'Deudas', hover: 'hover:bg-red-50 hover:text-red-600' },
                                    { href: '/ahorros', icon: '🐷', label: 'Ahorros', hover: 'hover:bg-yellow-50 hover:text-yellow-600' },
                                    { href: '/predicciones', icon: '🔮', label: 'Predicciones', hover: 'hover:bg-purple-50 hover:text-purple-600' },
                                ].map(item => (
                                    <Link key={item.href} href={item.href}
                                        className={`block px-4 py-3 text-gray-700 font-medium ${item.hover} transition-colors duration-200 border-b border-gray-100`}
                                        onClick={() => setMenuAbierto(false)}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <span className="text-xl">{item.icon}</span>
                                            <span>{item.label}</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="mb-6">
                    <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                        ¡Hola, {primerNombre}! 👋
                    </h2>
                    <p className="text-gray-600 mt-1">Aquí tienes un resumen de tus finanzas</p>
                </div>

                {/* 🔥 FILTRO DESDE - HASTA (MODIFICADO) 🔥 */}
                <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between bg-white rounded-2xl shadow-md p-6">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-4 md:mb-0">
                        Mi tablero de control
                    </h2>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="flex items-center space-x-2">
                            <label htmlFor="fechaDesde" className="text-gray-700 font-medium">📅 Desde:</label>
                            <input
                                type="date"
                                id="fechaDesde"
                                value={fechaDesde}
                                onChange={(e) => setFechaDesde(e.target.value)}
                                className="w-48 px-4 py-2.5 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-700 font-medium"
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <label htmlFor="fechaHasta" className="text-gray-700 font-medium">📅 Hasta:</label>
                            <input
                                type="date"
                                id="fechaHasta"
                                value={fechaHasta}
                                onChange={(e) => setFechaHasta(e.target.value)}
                                className="w-48 px-4 py-2.5 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-700 font-medium"
                            />
                        </div>
                    </div>
                </div>

                {/* Resto del contenido (sin cambios, igual a tu código original) */}
                {/* Tarjetas resumen */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-[#10B981] to-[#059669] rounded-2xl shadow-xl p-6 transform hover:scale-105 transition-transform duration-300">
                        <p className="text-white/80 text-sm font-medium uppercase">INGRESOS</p>
                        <p className="text-2xl md:text-3xl font-bold text-white mt-2">{formatearMoneda(totales.ingresos)}</p>
                        <p className="mt-4 text-white/60 text-sm">{ingresosConDetalle.length} transacciones</p>
                    </div>
                    <div className="bg-gradient-to-br from-[#EF4444] to-[#DC2626] rounded-2xl shadow-xl p-6 transform hover:scale-105 transition-transform duration-300">
                        <p className="text-white/80 text-sm font-medium uppercase">GASTOS</p>
                        <p className="text-2xl md:text-3xl font-bold text-white mt-2">{formatearMoneda(totales.gastos)}</p>
                        <p className="mt-4 text-white/60 text-sm">{transaccionesFiltradas.filter(t => t.type === 'GASTO').length} transacciones</p>
                    </div>
                    <div className="bg-gradient-to-br from-[#3B82F6] to-[#2563EB] rounded-2xl shadow-xl p-6 transform hover:scale-105 transition-transform duration-300">
                        <p className="text-white/80 text-sm font-medium uppercase">BALANCE</p>
                        <p className="text-2xl md:text-3xl font-bold text-white mt-2">{formatearMoneda(totales.balance)}</p>
                        <div className="mt-4 text-white/60 text-sm">{totales.balance >= 0 ? '✅ Saludable' : '⚠️ Atención'}</div>
                    </div>
                </div>

                {/* Evolución mensual */}
                <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8 mb-8 overflow-x-auto">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                        <span className="w-3 h-3 bg-blue-500 rounded-full mr-3"></span>
                        Evolución Mensual
                    </h3>
                    <div className="h-[300px] md:h-[350px] min-w-[600px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={evolucionMensual} margin={{ top: 20, right: 30, left: 60, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="mes" tick={{ fill: '#6B7280', fontSize: 12 }} />
                                <YAxis tickFormatter={(v) => formatearMoneda(v)} tick={{ fill: '#6B7280', fontSize: 12 }} width={80} />
                                <Tooltip formatter={(v) => formatearMoneda(Number(v))} contentStyle={{ backgroundColor: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', padding: '12px' }} />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Line type="monotone" dataKey="ingresos" stroke="#10B981" name="Ingresos" strokeWidth={3} />
                                <Line type="monotone" dataKey="gastos" stroke="#EF4444" name="Gastos" strokeWidth={3} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gráficos resumen */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8 overflow-x-auto">
                        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                            <span className="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
                            Ingresos vs Gastos
                        </h3>
                        <div className="h-[300px] min-w-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={datosBarra} margin={{ top: 20, right: 30, left: 60, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} />
                                    <YAxis tickFormatter={(v) => formatearMoneda(v)} tick={{ fill: '#6B7280', fontSize: 12 }} width={80} />
                                    <Tooltip formatter={(v) => formatearMoneda(Number(v))} contentStyle={{ backgroundColor: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', padding: '12px' }} />
                                    <Bar dataKey="valor" radius={[10, 10, 0, 0]}>
                                        {datosBarra.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Gastos por categoría — lista con barras */}
                    <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8">
                        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                            <span className="w-3 h-3 bg-purple-500 rounded-full mr-3"></span>
                            Gastos por Categoría
                        </h3>
                        {datosGastosPorCategoria.length > 0 ? (
                            <div
                                className="space-y-3 overflow-y-auto pr-1"
                                style={{ maxHeight: '300px', WebkitOverflowScrolling: 'touch' }}
                            >
                                {datosGastosPorCategoria.map((item, index) => {
                                    const maxValor = datosGastosPorCategoria[0].value
                                    const pct = Math.round((item.value / maxValor) * 100)
                                    const color = coloresCategorias[index % coloresCategorias.length]
                                    return (
                                        <div key={item.name}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-medium text-gray-700 truncate max-w-[60%]">{item.name}</span>
                                                <span className="text-sm font-bold text-gray-800 ml-2 shrink-0">{formatearMoneda(item.value)}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2">
                                                <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-48">
                                <p className="text-gray-400 text-center">No hay gastos en este período</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Detalle de transacciones */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Detalle Ingresos */}
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                        <div className="px-6 py-5 bg-gradient-to-r from-[#10B981] to-[#059669]">
                            <h3 className="text-lg font-bold text-white flex items-center">
                                <span className="mr-2">💰</span>
                                Detalle de Ingresos
                            </h3>
                        </div>
                        <div className="overflow-y-auto" style={{ maxHeight: '384px', WebkitOverflowScrolling: 'touch' }}>
                            <div className="divide-y divide-gray-100">
                                {ingresosConDetalle.length > 0 ? (
                                    ingresosConDetalle.map((transaccion) => {
                                        const fechaTransaccion = new Date(transaccion.date)
                                        const hoy = new Date()
                                        hoy.setHours(0, 0, 0, 0)
                                        const isFuture = fechaTransaccion > hoy
                                        const shouldBeChecked = !isFuture

                                        return (
                                            <div key={transaccion.id} className="px-4 md:px-6 py-4 hover:bg-green-50 transition-colors duration-200 group">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                                                        <input
                                                            type="checkbox"
                                                            checked={shouldBeChecked}
                                                            onChange={() => handleToggleCompleted(transaccion.id, transaccion.completed)}
                                                            className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer shrink-0"
                                                            disabled={isFuture}
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                                <p className="text-sm font-medium text-gray-900 truncate max-w-[150px] md:max-w-none">
                                                                    {transaccion.conceptName}
                                                                </p>
                                                                <div className="flex items-center space-x-2 shrink-0">
                                                                    <button onClick={() => handleEdit(transaccion.id)} className="text-blue-600 hover:text-blue-800" title="Editar">✏️</button>
                                                                    <button onClick={() => handleDelete(transaccion.id)} className="text-red-600 hover:text-red-800" title="Eliminar">🗑️</button>
                                                                </div>
                                                            </div>
                                                            <p className="text-xs text-gray-500">
                                                                {formatearFecha(transaccion.date)}
                                                                {isFuture && ' (Futuro)'}
                                                            </p>
                                                            {transaccion.category && (
                                                                <p className="text-xs text-gray-400 mt-1 truncate">{transaccion.category} • {transaccion.subType}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className="text-sm font-bold text-[#10B981] bg-green-100 px-2 md:px-3 py-1 rounded-full shrink-0 ml-2">
                                                        {formatearMoneda(transaccion.value)}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    })
                                ) : (
                                    <p className="px-6 py-12 text-center text-gray-400">No hay ingresos en este período</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Detalle Gastos por Categoría expandible */}
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                        <div className="px-6 py-5 bg-gradient-to-r from-[#EF4444] to-[#DC2626]">
                            <h3 className="text-lg font-bold text-white flex items-center">
                                <span className="mr-2">💸</span>
                                Gastos por Categoría
                            </h3>
                        </div>
                        <div className="overflow-y-auto" style={{ maxHeight: '384px', WebkitOverflowScrolling: 'touch' }}>
                            <div className="divide-y divide-gray-100">
                                {gastosPorCategoriaConDetalle.length > 0 ? (
                                    gastosPorCategoriaConDetalle.map((item) => (
                                        <div key={item.categoria} className="border-b border-gray-100 last:border-0">
                                            <div
                                                onClick={() => setCategoriaExpandida(
                                                    categoriaExpandida === item.categoria ? null : item.categoria
                                                )}
                                                className="px-4 md:px-6 py-4 flex justify-between items-center cursor-pointer hover:bg-red-50 transition-colors duration-200"
                                            >
                                                <div className="flex items-center space-x-2 min-w-0">
                                                    <span className="text-gray-800 font-medium truncate">{item.categoria}</span>
                                                    <span className="text-xs text-gray-400 shrink-0">({item.transacciones.length})</span>
                                                </div>
                                                <div className="flex items-center space-x-3 shrink-0">
                                                    <span className="font-bold text-[#EF4444] bg-red-100 px-2 md:px-3 py-1 rounded-full text-sm">
                                                        {formatearMoneda(item.total)}
                                                    </span>
                                                    <span className="text-gray-400">{categoriaExpandida === item.categoria ? '▼' : '▶'}</span>
                                                </div>
                                            </div>

                                            {categoriaExpandida === item.categoria && (
                                                <div className="bg-gray-50 px-4 md:px-6 py-2 space-y-2">
                                                    {item.transacciones.map((transaccion) => {
                                                        const fechaTransaccion = new Date(transaccion.date)
                                                        const hoy = new Date()
                                                        hoy.setHours(0, 0, 0, 0)
                                                        const isFuture = fechaTransaccion > hoy
                                                        const shouldBeChecked = !isFuture

                                                        return (
                                                            <div key={transaccion.id} className="py-2 hover:bg-white transition-colors duration-200 group rounded-lg px-3">
                                                                <div className="flex justify-between items-start">
                                                                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={shouldBeChecked}
                                                                            onChange={(e) => { e.stopPropagation(); handleToggleCompleted(transaccion.id, transaccion.completed) }}
                                                                            className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer shrink-0"
                                                                            disabled={isFuture}
                                                                        />
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                                                <p className="text-sm font-medium text-gray-800 truncate max-w-[120px] md:max-w-none">
                                                                                    {transaccion.conceptName}
                                                                                </p>
                                                                                <div className="flex items-center space-x-2 shrink-0">
                                                                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(transaccion.id) }} className="text-blue-600 hover:text-blue-800" title="Editar">✏️</button>
                                                                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(transaccion.id) }} className="text-red-600 hover:text-red-800" title="Eliminar">🗑️</button>
                                                                                </div>
                                                                            </div>
                                                                            <p className="text-xs text-gray-500">
                                                                                {formatearFecha(transaccion.date)}
                                                                                {isFuture && ' (Futuro)'}
                                                                            </p>
                                                                            {transaccion.subType && (
                                                                                <p className="text-xs text-gray-400 mt-1">{transaccion.subType}</p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <p className="text-sm font-bold text-[#EF4444] bg-red-100 px-2 md:px-3 py-1 rounded-full shrink-0 ml-2">
                                                                        {formatearMoneda(transaccion.value)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="px-6 py-12 text-center text-gray-400">No hay gastos en este período</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}