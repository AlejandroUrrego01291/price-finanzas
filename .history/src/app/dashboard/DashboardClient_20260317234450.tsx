'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
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

// Componente de botón de navegación reutilizable
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
    const [mesSeleccionado, setMesSeleccionado] = useState<string>(
        mesesDisponibles[0] || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
    )

    // Filtrar transacciones por mes seleccionado
    const transaccionesFiltradas = useMemo(() => {
        if (!mesSeleccionado) return transacciones

        const [año, mes] = mesSeleccionado.split('-')
        return transacciones.filter(t => {
            const fecha = new Date(t.date)
            return fecha.getFullYear() === Number(año) && fecha.getMonth() + 1 === Number(mes)
        })
    }, [transacciones, mesSeleccionado])

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

    // Datos para gráfico de barras (ingresos vs gastos)
    const datosBarra = useMemo(() => {
        return [
            { name: 'Ingresos', valor: totales.ingresos, fill: '#10B981' },
            { name: 'Gastos', valor: totales.gastos, fill: '#EF4444' }
        ]
    }, [totales])

    // Datos para gráfico de pastel (gastos por categoría)
    const datosGastosPorCategoria = useMemo(() => {
        const gastosPorCategoria: { [key: string]: number } = {}

        transaccionesFiltradas
            .filter(t => t.type === 'GASTO')
            .forEach(t => {
                const categoria = t.category || 'Sin categoría'
                gastosPorCategoria[categoria] = (gastosPorCategoria[categoria] || 0) + t.value
            })

        return Object.entries(gastosPorCategoria)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
    }, [transaccionesFiltradas])

    // Datos para ingresos por concepto
    const ingresosPorConcepto = useMemo(() => {
        const ingresos: { [key: string]: number } = {}

        transaccionesFiltradas
            .filter(t => t.type === 'INGRESO')
            .forEach(t => {
                ingresos[t.conceptName] = (ingresos[t.conceptName] || 0) + t.value
            })

        return Object.entries(ingresos)
            .map(([name, valor]) => ({ name, valor }))
            .sort((a, b) => b.valor - a.valor)
    }, [transaccionesFiltradas])

    // Datos para evolución mensual (últimos 6 meses)
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

    const formatearMoneda = (valor: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(valor)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Navbar moderno con efecto glassmorphism */}
            <nav className="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-50 border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        {/* Logo con gradiente */}
                        <div className="flex items-center">
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                Price
                            </h1>
                            <span className="ml-3 text-sm text-gray-500 hidden md:inline-block">
                                Finanzas Personales
                            </span>
                        </div>

                        {/* Botones de navegación - Transacciones primero */}
                        <div className="hidden md:flex items-center space-x-2">
                            <NavButton href="/transacciones" icon="💰" text="Transacciones" color="blue" />
                            <NavButton href="/conceptos" icon="📁" text="Conceptos" color="green" />
                            <NavButton href="/deudas" icon="💳" text="Deudas" color="red" />
                            <NavButton href="/ahorros" icon="🐷" text="Ahorros" color="yellow" />
                            <NavButton href="/predicciones" icon="🔮" text="Predicciones" color="purple" />
                        </div>

                        {/* Solo botón de cierre de sesión - SIN Demo User */}
                        <div className="flex items-center">
                            <Link
                                href="/api/auth/signout"
                                className="px-5 py-2.5 text-sm font-medium text-red-600 hover:text-white border-2 border-red-600 rounded-full hover:bg-red-600 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg flex items-center space-x-2"
                            >
                                <span>🚪</span>
                                <span className="hidden md:inline">Cerrar sesión</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Selector de mes con diseño mejorado */}
                <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between bg-white rounded-2xl shadow-md p-6">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-4 md:mb-0">
                        Mi tablero de control
                    </h2>
                    <div className="flex items-center space-x-3">
                        <label htmlFor="mes" className="text-gray-700 font-medium">
                            📅 Período:
                        </label>
                        <select
                            id="mes"
                            value={mesSeleccionado}
                            onChange={(e) => setMesSeleccionado(e.target.value)}
                            className="w-64 px-4 py-2.5 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-700 font-medium"
                        >
                            {mesesDisponibles.map(mes => {
                                const [año, mesNum] = mes.split('-')
                                const fecha = new Date(Number(año), Number(mesNum) - 1)
                                return (
                                    <option key={mes} value={mes}>
                                        {fecha.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
                                    </option>
                                )
                            })}
                        </select>
                    </div>
                </div>

                {/* Tarjetas de resumen con colores coherentes a las barras */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Tarjeta de Ingresos - Color verde como la barra de ingresos */}
                    <div className="bg-gradient-to-br from-[#10B981] to-[#059669] rounded-2xl shadow-xl p-6 transform hover:scale-105 transition-transform duration-300">
                        <p className="text-white/80 text-sm font-medium uppercase tracking-wider">INGRESOS</p>
                        <p className="text-3xl font-bold text-white mt-2">{formatearMoneda(totales.ingresos)}</p>
                        <div className="mt-4 text-white/60 text-sm">↑ +12% vs mes anterior</div>
                    </div>

                    {/* Tarjeta de Gastos - Color rojo como la barra de gastos */}
                    <div className="bg-gradient-to-br from-[#EF4444] to-[#DC2626] rounded-2xl shadow-xl p-6 transform hover:scale-105 transition-transform duration-300">
                        <p className="text-white/80 text-sm font-medium uppercase tracking-wider">GASTOS</p>
                        <p className="text-3xl font-bold text-white mt-2">{formatearMoneda(totales.gastos)}</p>
                        <div className="mt-4 text-white/60 text-sm">↓ -5% vs mes anterior</div>
                    </div>

                    {/* Tarjeta de Balance - Color azul */}
                    <div className={`bg-gradient-to-br from-[#3B82F6] to-[#2563EB] rounded-2xl shadow-xl p-6 transform hover:scale-105 transition-transform duration-300`}>
                        <p className="text-white/80 text-sm font-medium uppercase tracking-wider">BALANCE</p>
                        <p className="text-3xl font-bold text-white mt-2">{formatearMoneda(totales.balance)}</p>
                        <div className="mt-4 text-white/60 text-sm">
                            {totales.balance >= 0 ? '✅ Saludable' : '⚠️ Atención'}
                        </div>
                    </div>
                </div>

                {/* Evolución mensual con diseño mejorado */}
                <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                        <span className="w-3 h-3 bg-blue-500 rounded-full mr-3"></span>
                        Evolución Mensual
                    </h3>
                    <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={evolucionMensual} margin={{ top: 20, right: 30, left: 80, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="mes" tick={{ fill: '#6B7280', fontSize: 12 }} />
                            <YAxis
                                tickFormatter={(value) => formatearMoneda(value)}
                                tick={{ fill: '#6B7280', fontSize: 12 }}
                                width={100}
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
                            <Line
                                type="monotone"
                                dataKey="ingresos"
                                stroke="#10B981"
                                name="Ingresos"
                                strokeWidth={3}
                                dot={{ r: 6, fill: '#10B981', strokeWidth: 2, stroke: 'white' }}
                                activeDot={{ r: 8, fill: '#10B981' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="gastos"
                                stroke="#EF4444"
                                name="Gastos"
                                strokeWidth={3}
                                dot={{ r: 6, fill: '#EF4444', strokeWidth: 2, stroke: 'white' }}
                                activeDot={{ r: 8, fill: '#EF4444' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Gráficos de resumen */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Gráfico de barras - Ingresos vs Gastos */}
                    <div className="bg-white rounded-2xl shadow-xl p-8">
                        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                            <span className="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
                            Ingresos vs Gastos
                        </h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={datosBarra} margin={{ top: 20, right: 30, left: 80, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} />
                                    <YAxis
                                        tickFormatter={(value) => formatearMoneda(value)}
                                        tick={{ fill: '#6B7280', fontSize: 12 }}
                                        width={100}
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
                                    <Bar
                                        dataKey="valor"
                                        radius={[10, 10, 0, 0]}
                                    >
                                        {datosBarra.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Gráfico de pastel - Gastos por categoría */}
                    <div className="bg-white rounded-2xl shadow-xl p-8">
                        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                            <span className="w-3 h-3 bg-purple-500 rounded-full mr-3"></span>
                            Gastos por Categoría
                        </h3>
                        <div className="h-80">
                            {datosGastosPorCategoria.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
                                        <Pie
                                            data={datosGastosPorCategoria}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={true}
                                            label={(entry) => `${entry.name}`}
                                            outerRadius={120}
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

                {/* Detalles con diseño mejorado */}
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
                            {ingresosPorConcepto.map((item, index) => (
                                <div key={index} className="px-6 py-4 flex justify-between items-center hover:bg-green-50 transition-colors duration-200">
                                    <span className="text-gray-800 font-medium">{item.name}</span>
                                    <span className="font-bold text-[#10B981] bg-green-100 px-3 py-1 rounded-full">
                                        {formatearMoneda(item.valor)}
                                    </span>
                                </div>
                            ))}
                            {ingresosPorConcepto.length === 0 && (
                                <p className="px-6 py-12 text-center text-gray-400">No hay ingresos en este período</p>
                            )}
                        </div>
                    </div>

                    {/* Detalle de Gastos por Categoría */}
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                        <div className="px-6 py-5 bg-gradient-to-r from-[#EF4444] to-[#DC2626]">
                            <h3 className="text-lg font-bold text-white flex items-center">
                                <span className="mr-2">💸</span>
                                Detalle de Gastos por Categoría
                            </h3>
                        </div>
                        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                            {datosGastosPorCategoria.map((item, index) => (
                                <div key={index} className="px-6 py-4 flex justify-between items-center hover:bg-red-50 transition-colors duration-200">
                                    <span className="text-gray-800 font-medium">{item.name}</span>
                                    <span className="font-bold text-[#EF4444] bg-red-100 px-3 py-1 rounded-full">
                                        {formatearMoneda(item.value)}
                                    </span>
                                </div>
                            ))}
                            {datosGastosPorCategoria.length === 0 && (
                                <p className="px-6 py-12 text-center text-gray-400">No hay gastos en este período</p>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}