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
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-title text-xl">Dashboard - Administración de mis finanzas personales</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Link href="/conceptos" className="text-body hover:text-gray-900">
                                Conceptos
                            </Link>
                            <Link href="/transacciones" className="text-body hover:text-gray-900">
                                Transacciones
                            </Link>
                            <Link href="/deudas" className="text-body hover:text-gray-900">
                                Deudas
                            </Link>
                            <Link href="/ahorros" className="text-body hover:text-gray-900">
                                Ahorros
                            </Link>
                            <Link href="/predicciones" className="text-body hover:text-gray-900">
                                Predicciones
                            </Link>
                            <Link
                                href="/api/auth/signout"
                                className="text-sm text-red-600 hover:text-red-800"
                            >
                                Cerrar sesión
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {/* Selector de mes */}
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-subtitle text-2xl">Mi tablero de control</h2>
                    <div className="flex items-center space-x-2">
                        <label htmlFor="mes" className="text-body text-sm font-medium">
                            Período:
                        </label>
                        <select
                            id="mes"
                            value={mesSeleccionado}
                            onChange={(e) => setMesSeleccionado(e.target.value)}
                            className="block w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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

                {/* Tarjetas de resumen */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                        <p className="text-sm font-medium text-gray-600 uppercase">Ingresos</p>
                        <p className="text-2xl font-bold text-green-600">{formatearMoneda(totales.ingresos)}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
                        <p className="text-sm font-medium text-gray-600 uppercase">Gastos</p>
                        <p className="text-2xl font-bold text-red-600">{formatearMoneda(totales.gastos)}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                        <p className="text-sm font-medium text-gray-600 uppercase">Balance</p>
                        <p className={`text-2xl font-bold ${totales.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {formatearMoneda(totales.balance)}
                        </p>
                    </div>
                </div>

                {/* Evolución mensual */}
                <div className="bg-white shadow rounded-lg p-6 mb-8">
                    <h3 className="text-subtitle text-lg mb-4">Evolución Mensual</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={evolucionMensual}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="mes" />
                            <YAxis tickFormatter={(value) => formatearMoneda(value)} />
                            <Tooltip formatter={(value) => formatearMoneda(Number(value))} />
                            <Legend />
                            <Line type="monotone" dataKey="ingresos" stroke="#10B981" name="Ingresos" strokeWidth={2} />
                            <Line type="monotone" dataKey="gastos" stroke="#EF4444" name="Gastos" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Gráficos de resumen */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Gráfico de barras - Ingresos vs Gastos */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-subtitle text-lg mb-4">Ingresos vs Gastos</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={datosBarra} margin={{ top: 20, right: 30, left: 60, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" tick={{ fill: '#374151' }} />
                                    <YAxis
                                        tickFormatter={(value) => formatearMoneda(value)}
                                        tick={{ fill: '#374151', fontSize: 12 }}
                                        width={80}
                                    />
                                    <Tooltip
                                        formatter={(value) => formatearMoneda(Number(value))}
                                        contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb' }}
                                    />
                                    <Bar dataKey="valor">
                                        {datosBarra.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Gráfico de pastel - Gastos por categoría */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-subtitle text-lg mb-4">Gastos por Categoría</h3>
                        <div className="h-80">
                            {datosGastosPorCategoria.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
                                        <Pie
                                            data={datosGastosPorCategoria}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={true}
                                            label={(entry) => `${entry.name}: ${formatearMoneda(entry.value)}`}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {datosGastosPorCategoria.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value) => formatearMoneda(Number(value))}
                                            contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-gray-500 text-center py-12">No hay gastos en este período</p>
                            )}
                        </div>
                    </div>
                </div>


                {/* Detalles */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Detalle de Ingresos */}
                    <div className="bg-white shadow rounded-lg overflow-hidden">
                        <div className="px-6 py-4 bg-green-50 border-b border-green-200">
                            <h3 className="text-subtitle text-green-800">Detalle de Ingresos</h3>
                        </div>
                        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                            {ingresosPorConcepto.map((item, index) => (
                                <div key={index} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50">
                                    <span className="text-gray-900 font-medium">{item.name}</span>
                                    <span className="font-medium text-green-600">{formatearMoneda(item.valor)}</span>
                                </div>
                            ))}
                            {ingresosPorConcepto.length === 0 && (
                                <p className="px-6 py-8 text-center text-gray-500">No hay ingresos en este período</p>
                            )}
                        </div>
                    </div>

                    {/* Detalle de Gastos por Categoría */}
                    <div className="bg-white shadow rounded-lg overflow-hidden">
                        <div className="px-6 py-4 bg-red-50 border-b border-red-200">
                            <h3 className="text-subtitle text-red-800">Detalle de Gastos por Categoría</h3>
                        </div>
                        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                            {datosGastosPorCategoria.map((item, index) => (
                                <div key={index} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50">
                                    <span className="text-gray-900 font-medium">{item.name}</span>
                                    <span className="font-medium text-red-600">{formatearMoneda(item.value)}</span>
                                </div>
                            ))}
                            {datosGastosPorCategoria.length === 0 && (
                                <p className="px-6 py-8 text-center text-gray-500">No hay gastos en este período</p>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}