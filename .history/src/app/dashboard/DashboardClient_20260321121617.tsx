'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line
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
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#6B66FF']

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

export default function DashboardClient({ transacciones, mesesDisponibles }: Props) {
    const router = useRouter()
    const [fechaFiltro, setFechaFiltro] = useState<string>(
        new Date().toISOString().split('T')[0]
    )
    const [categoriaExpandida, setCategoriaExpandida] = useState<string | null>(null)
    const [menuAbierto, setMenuAbierto] = useState(false)

    // Filtrar transacciones desde la fecha seleccionada hacia atrás
    const transaccionesFiltradas = useMemo(() => {
        if (!fechaFiltro) return transacciones

        const fechaLimite = new Date(fechaFiltro)
        fechaLimite.setHours(23, 59, 59, 999)

        return transacciones.filter(t => {
            const fechaTransaccion = new Date(t.date)
            return fechaTransaccion <= fechaLimite
        })
    }, [transacciones, fechaFiltro])

    // Calcular totales
    const totales = useMemo(() => {
        const ingresos = transaccionesFiltradas
            .filter(t => t.type === 'INGRESO')
            .reduce((sum, t) => sum + t.value, 0)

        const gastos = transaccionesFiltradas
            .filter(t => t.type === 'GASTO')
            .reduce((sum, t) => sum + t.value, 0)

        return { ingresos, gastos, balance: ingresos - gastos }
    }, [transaccionesFiltradas])

    // Datos para gráfico de barras
    const datosBarra = useMemo(() => {
        return [
            { name: 'Ingresos', valor: totales.ingresos, fill: '#10B981' },
            { name: 'Gastos', valor: totales.gastos, fill: '#EF4444' }
        ]
    }, [totales])

    // Datos para ingresos con detalles
    const ingresosConDetalle = useMemo(() => {
        return transaccionesFiltradas
            .filter(t => t.type === 'INGRESO')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }, [transaccionesFiltradas])

    // Datos para gastos agrupados por categoría
    const gastosPorCategoriaConDetalle = useMemo(() => {
        const gastosPorCategoria: {
            [key: string]: {
                total: number,
                transacciones: Transaccion[]
            }
        } = {}

        transaccionesFiltradas
            .filter(t => t.type === 'GASTO')
            .forEach(t => {
                const categoria = t.category || 'Sin categoría'
                if (!gastosPorCategoria[categoria]) {
                    gastosPorCategoria[categoria] = { total: 0, transacciones: [] }
                }
                gastosPorCategoria[categoria].total += t.value
                gastosPorCategoria[categoria].transacciones.push(t)
            })

        Object.keys(gastosPorCategoria).forEach(cat => {
            gastosPorCategoria[cat].transacciones.sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            )
        })

        return Object.entries(gastosPorCategoria)
            .map(([categoria, data]) => ({
                categoria,
                total: data.total,
                transacciones: data.transacciones
            }))
            .sort((a, b) => b.total - a.total)
    }, [transaccionesFiltradas])

    // Datos para gráfico de pastel
    const datosGastosPorCategoria = useMemo(() => {
        return gastosPorCategoriaConDetalle.map(item => ({
            name: item.categoria,
            value: item.total
        }))
    }, [gastosPorCategoriaConDetalle])

    // Datos para evolución mensual
    const evolucionMensual = useMemo(() => {
        const ultimosMeses = mesesDisponibles.slice(0, 6).reverse()

        return ultimosMeses.map(mes => {
            const [año, mesNum] = mes.split('-')
            const transaccionesMes = transacciones.filter(t => {
                const fecha = new Date(t.date)
                return fecha.getFullYear() === Number(año) && fecha.getMonth() + 1 === Number(mesNum)
            })

            const ingresos = transaccionesMes
                .filter(t => t.type === 'INGRESO')
                .reduce((sum, t) => sum + t.value, 0)

            const gastos = transaccionesMes
                .filter(t => t.type === 'GASTO')
                .reduce((sum, t) => sum + t.value, 0)

            const fecha = new Date(Number(año), Number(mesNum) - 1)
            return {
                mes: fecha.toLocaleDateString('es-CO', { month: 'short' }),
                ingresos,
                gastos
            }
        })
    }, [transacciones, mesesDisponibles])

    const handleEdit = (id: string) => {
        router.push(`/transacciones?edit=${id}`)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta transacción?')) return

        try {
            const response = await fetch(`/api/transacciones?id=${id}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                router.refresh()
            }
        } catch (error) {
            console.error('Error:', error)
        }
    }

    const handleToggleCompleted = async (id: string, currentCompleted: boolean) => {
        try {
            const response = await fetch(`/api/transacciones?id=${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: !currentCompleted })
            })

            if (response.ok) {
                router.refresh()
            }
        } catch (error) {
            console.error('Error:', error)
        }
    }

    const formatearMoneda = (valor: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(valor)
    }

    const formatearFecha = (fecha: string) => {
        return new Date(fecha).toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Navbar */}
            <nav className="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-50 border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        <div className="flex items-center">
                            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                Mis finanzas
                            </h1>
                        </div>

                        {/* Menú de escritorio */}
                        <div className="hidden md:flex items-center space-x-2">
                            <NavButton href="/transacciones" icon="💰" text="Transacciones" color="blue" />
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

                        {/* Botón menú hamburguesa (solo móvil) */}
                        <div className="md:hidden flex items-center space-x-2">
                            <Link
                                href="/api/auth/signout"
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Cerrar sesión"
                            >
                                <span className="text-xl">🚪</span>
                            </Link>
                            <button
                                onClick={() => setMenuAbierto(!menuAbierto)}
                                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {menuAbierto ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    )}
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Menú móvil desplegable */}
                    {menuAbierto && (
                        <div className="md:hidden absolute left-0 right-0 bg-white/95 backdrop-blur-md shadow-lg border-t border-gray-200 py-2 z-50">
                            <div className="max-w-7xl mx-auto px-4">
                                <Link
                                    href="/transacciones"
                                    className="block px-4 py-3 text-gray-700 font-medium hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200 border-b border-gray-100"
                                    onClick={() => setMenuAbierto(false)}
                                >
                                    <div className="flex items-center space-x-3">
                                        <span className="text-xl">💰</span>
                                        <span>Transacciones</span>
                                    </div>
                                </Link>
                                <Link
                                    href="/conceptos"
                                    className="block px-4 py-3 text-gray-700 font-medium hover:bg-green-50 hover:text-green-600 transition-colors duration-200 border-b border-gray-100"
                                    onClick={() => setMenuAbierto(false)}
                                >
                                    <div className="flex items-center space-x-3">
                                        <span className="text-xl">📁</span>
                                        <span>Conceptos</span>
                                    </div>
                                </Link>
                                <Link
                                    href="/deudas"
                                    className="block px-4 py-3 text-gray-700 font-medium hover:bg-red-50 hover:text-red-600 transition-colors duration-200 border-b border-gray-100"
                                    onClick={() => setMenuAbierto(false)}
                                >
                                    <div className="flex items-center space-x-3">
                                        <span className="text-xl">💳</span>
                                        <span>Deudas</span>
                                    </div>
                                </Link>
                                <Link
                                    href="/ahorros"
                                    className="block px-4 py-3 text-gray-700 font-medium hover:bg-yellow-50 hover:text-yellow-600 transition-colors duration-200 border-b border-gray-100"
                                    onClick={() => setMenuAbierto(false)}
                                >
                                    <div className="flex items-center space-x-3">
                                        <span className="text-xl">🐷</span>
                                        <span>Ahorros</span>
                                    </div>
                                </Link>
                                <Link
                                    href="/predicciones"
                                    className="block px-4 py-3 text-gray-700 font-medium hover:bg-purple-50 hover:text-purple-600 transition-colors duration-200 border-b border-gray-100"
                                    onClick={() => setMenuAbierto(false)}
                                >
                                    <div className="flex items-center space-x-3">
                                        <span className="text-xl">🔮</span>
                                        <span>Predicciones</span>
                                    </div>
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Selector de fecha */}
                <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between bg-white rounded-2xl shadow-md p-6">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-4 md:mb-0">
                        Mi tablero de control
                    </h2>
                    <div className="flex items-center space-x-3">
                        <label htmlFor="fecha" className="text-gray-700 font-medium">
                            📅 Desde:
                        </label>
                        <input
                            type="date"
                            id="fecha"
                            value={fechaFiltro}
                            onChange={(e) => setFechaFiltro(e.target.value)}
                            className="w-48 md:w-64 px-4 py-2.5 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-700 font-medium"
                        />
                    </div>
                </div>

                {/* Tarjetas de resumen */}
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
                        <div className="mt-4 text-white/60 text-sm">
                            {totales.balance >= 0 ? '✅ Saludable' : '⚠️ Atención'}
                        </div>
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
                                <YAxis
                                    tickFormatter={(value) => formatearMoneda(value)}
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                    width={80}
                                />
                                <Tooltip
                                    formatter={(value) => formatearMoneda(Number(value))}
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                                        padding: '12px'
                                    }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Line type="monotone" dataKey="ingresos" stroke="#10B981" name="Ingresos" strokeWidth={3} />
                                <Line type="monotone" dataKey="gastos" stroke="#EF4444" name="Gastos" strokeWidth={3} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gráficos de resumen */}
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
                                    <YAxis
                                        tickFormatter={(value) => formatearMoneda(value)}
                                        tick={{ fill: '#6B7280', fontSize: 12 }}
                                        width={80}
                                    />
                                    <Tooltip
                                        formatter={(value) => formatearMoneda(Number(value))}
                                        contentStyle={{
                                            backgroundColor: 'white',
                                            border: 'none',
                                            borderRadius: '12px',
                                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                                            padding: '12px'
                                        }}
                                    />
                                    <Bar dataKey="valor" radius={[10, 10, 0, 0]}>
                                        {datosBarra.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8 overflow-x-auto">
                        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                            <span className="w-3 h-3 bg-purple-500 rounded-full mr-3"></span>
                            Gastos por Categoría
                        </h3>
                        <div className="h-[300px] min-w-[400px]">
                            {datosGastosPorCategoria.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
                                        <Pie
                                            data={datosGastosPorCategoria}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={true}
                                            label={(entry) => {
                                                const nombre = entry.name || 'Sin categoría'
                                                return nombre.length > 15 ? `${nombre.substring(0, 12)}...` : nombre
                                            }}
                                            outerRadius={100}
                                            innerRadius={40}
                                            fill="#8884d8"
                                            dataKey="value"
                                            paddingAngle={2}
                                        >
                                            {datosGastosPorCategoria.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value) => formatearMoneda(Number(value))}
                                            contentStyle={{
                                                backgroundColor: 'white',
                                                border: 'none',
                                                borderRadius: '12px',
                                                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                                                padding: '12px'
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center">
                                    <p className="text-gray-400 text-center">No hay gastos en este período</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Detalles con checkbox */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Detalle de Ingresos */}
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                        <div className="px-6 py-5 bg-gradient-to-r from-[#10B981] to-[#059669]">
                            <h3 className="text-lg font-bold text-white flex items-center">
                                <span className="mr-2">💰</span>
                                Detalle de Ingresos
                            </h3>
                        </div>
                        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                            {ingresosConDetalle.length > 0 ? (
                                ingresosConDetalle.map((transaccion) => {
                                    const fechaTransaccion = new Date(transaccion.date)
                                    const hoy = new Date()
                                    hoy.setHours(0, 0, 0, 0)
                                    const isFuture = fechaTransaccion > hoy
                                    // El checkbox debe estar marcado si la fecha es hoy o anterior
                                    const shouldBeChecked = !isFuture

                                    return (
                                        <div key={transaccion.id} className="px-6 py-4 hover:bg-green-50 transition-colors duration-200 group">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center space-x-3 flex-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={shouldBeChecked}
                                                        onChange={() => handleToggleCompleted(transaccion.id, transaccion.completed)}
                                                        className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                                                        disabled={isFuture}
                                                    />
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-sm font-medium text-gray-900">
                                                                {transaccion.conceptName}
                                                            </p>
                                                            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => handleEdit(transaccion.id)}
                                                                    className="text-blue-600 hover:text-blue-800"
                                                                    title="Editar"
                                                                >
                                                                    ✏️
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(transaccion.id)}
                                                                    className="text-red-600 hover:text-red-800"
                                                                    title="Eliminar"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-gray-500">
                                                            {formatearFecha(transaccion.date)}
                                                            {isFuture && ' (Futuro)'}
                                                        </p>
                                                        {transaccion.category && (
                                                            <p className="text-xs text-gray-400 mt-1">
                                                                {transaccion.category} • {transaccion.subType}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-sm font-bold text-[#10B981] bg-green-100 px-3 py-1 rounded-full ml-4">
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

                    {/* Detalle de Gastos por Categoría - Expandible */}
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                        <div className="px-6 py-5 bg-gradient-to-r from-[#EF4444] to-[#DC2626]">
                            <h3 className="text-lg font-bold text-white flex items-center">
                                <span className="mr-2">💸</span>
                                Gastos por Categoría
                            </h3>
                        </div>
                        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                            {gastosPorCategoriaConDetalle.length > 0 ? (
                                gastosPorCategoriaConDetalle.map((item) => (
                                    <div key={item.categoria} className="border-b border-gray-100 last:border-0">
                                        {/* Cabecera de categoría */}
                                        <div
                                            onClick={() => setCategoriaExpandida(
                                                categoriaExpandida === item.categoria ? null : item.categoria
                                            )}
                                            className="px-6 py-4 flex justify-between items-center cursor-pointer hover:bg-red-50 transition-colors duration-200"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <span className="text-gray-800 font-medium">{item.categoria}</span>
                                                <span className="text-xs text-gray-400">
                                                    ({item.transacciones.length})
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <span className="font-bold text-[#EF4444] bg-red-100 px-3 py-1 rounded-full">
                                                    {formatearMoneda(item.total)}
                                                </span>
                                                <span className="text-gray-400">
                                                    {categoriaExpandida === item.categoria ? '▼' : '▶'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Detalles expandidos */}
                                        {categoriaExpandida === item.categoria && (
                                            <div className="bg-gray-50 px-6 py-2 space-y-2">
                                                {item.transacciones.map((transaccion) => {
                                                    const fechaTransaccion = new Date(transaccion.date)
                                                    const hoy = new Date()
                                                    hoy.setHours(0, 0, 0, 0)
                                                    const isFuture = fechaTransaccion > hoy
                                                    // El checkbox debe estar marcado si la fecha es hoy o anterior
                                                    const shouldBeChecked = !isFuture

                                                    return (
                                                        <div key={transaccion.id} className="py-2 hover:bg-white transition-colors duration-200 group rounded-lg px-3">
                                                            <div className="flex justify-between items-start">
                                                                <div className="flex items-center space-x-3 flex-1">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={shouldBeChecked}
                                                                        onChange={(e) => {
                                                                            e.stopPropagation()
                                                                            handleToggleCompleted(transaccion.id, transaccion.completed)
                                                                        }}
                                                                        className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                                                                        disabled={isFuture}
                                                                    />
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center justify-between">
                                                                            <p className="text-sm font-medium text-gray-800">
                                                                                {transaccion.conceptName}
                                                                            </p>
                                                                            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation()
                                                                                        handleEdit(transaccion.id)
                                                                                    }}
                                                                                    className="text-blue-600 hover:text-blue-800"
                                                                                    title="Editar"
                                                                                >
                                                                                    ✏️
                                                                                </button>
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation()
                                                                                        handleDelete(transaccion.id)
                                                                                    }}
                                                                                    className="text-red-600 hover:text-red-800"
                                                                                    title="Eliminar"
                                                                                >
                                                                                    🗑️
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                        <p className="text-xs text-gray-500">
                                                                            {formatearFecha(transaccion.date)}
                                                                            {isFuture && ' (Futuro)'}
                                                                        </p>
                                                                        {transaccion.subType && (
                                                                            <p className="text-xs text-gray-400 mt-1">
                                                                                {transaccion.subType}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <p className="text-sm font-bold text-[#EF4444] bg-red-100 px-3 py-1 rounded-full ml-4">
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
            </main>
        </div>
    )
}