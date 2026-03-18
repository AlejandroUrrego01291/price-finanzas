'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
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

    // Datos para gastos por categoría (tabla)
    const gastosPorCategoria = useMemo(() => {
        const gastos: { [key: string]: { total: number, items: any[] } } = {}

        transaccionesFiltradas
            .filter(t => t.type === 'GASTO')
            .forEach(t => {
                const categoria = t.category || 'Sin categoría'
                if (!gastos[categoria]) {
                    gastos[categoria] = { total: 0, items: [] }
                }
                gastos[categoria].total += t.value
                gastos[categoria].items.push(t)
            })

        return Object.entries(gastos)
            .map(([categoria, data]) => ({ categoria, total: data.total, items: data.items }))
            .sort((a, b) => b.total - a.total)
    }, [transaccionesFiltradas])

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
                            <h1 className="text-xl font-semibold text-gray-900">Price - Dashboard Financiero</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Link href="/conceptos" className="text-sm text-gray-600 hover:text-gray-900">
                                Conceptos
                            </Link>
                            <Link href="/transacciones" className="text-sm text-gray-600 hover:text-gray-900">
                                Transacciones
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
                    <h2 className="text-2xl font-bold text-gray-900">Mi tablero de control</h2>
                    <div className="flex items-center space-x-2">
                        <label htmlFor="mes" className="text-sm font-medium text-gray-700">
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

                {/* Gráficos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Gráfico de barras - Ingresos vs Gastos */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-medium mb-4">Ingresos vs Gastos</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={datosBarra}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis tickFormatter={(value) => formatearMoneda(value)} />
                                <Tooltip formatter={(value) => formatearMoneda(Number(value))} />
                                <Bar dataKey="valor" fill="#8884d8">
                                    {datosBarra.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Gráfico de pastel - Gastos por categoría */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-medium mb-4">Gastos por Categoría</h3>
                        {datosGastosPorCategoria.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={datosGastosPorCategoria}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={(entry) => `${entry.name}: ${formatearMoneda(entry.value)}`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {datosGastosPorCategoria.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => formatearMoneda(Number(value))} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-gray-500 text-center py-12">No hay gastos en este período</p>
                        )}
                    </div>
                </div>

                {/* Detalles */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Detalle de Ingresos */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="px-6 py-4 bg-green-50 border-b border-green-200">
                            <h3 className="text-lg font-medium text-green-800">Detalle de Ingresos</h3>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {ingresosPorConcepto.map((item, index) => (
                                <div key={index} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50">
                                    <span className="text-gray-900">{item.name}</span>
                                    <span className="font-medium text-green-600">{formatearMoneda(item.valor)}</span>
                                </div>
                            ))}
                            {ingresosPorConcepto.length === 0 && (
                                <p className="px-6 py-8 text-center text-gray-500">No hay ingresos en este período</p>
                            )}
                        </div>
                    </div>

                    {/* Detalle de Gastos por Categoría */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="px-6 py-4 bg-red-50 border-b border-red-200">
                            <h3 className="text-lg font-medium text-red-800">Detalle de Gastos por Categoría</h3>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {gastosPorCategoria.map((item, index) => (
                                <div key={index} className="px-6 py-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-gray-900 font-medium">{item.categoria}</span>
                                        <span className="font-medium text-red-600">{formatearMoneda(item.total)}</span>
                                    </div>
                                    <div className="pl-4 space-y-1">
                                        {item.items.slice(0, 3).map((transaccion: any) => (
                                            <div key={transaccion.id} className="flex justify-between text-sm text-gray-600">
                                                <span>{transaccion.conceptName}</span>
                                                <span>{formatearMoneda(transaccion.value)}</span>
                                            </div>
                                        ))}
                                        {item.items.length > 3 && (
                                            <p className="text-xs text-gray-400 mt-1">
                                                +{item.items.length - 3} conceptos más
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {gastosPorCategoria.length === 0 && (
                                <p className="px-6 py-8 text-center text-gray-500">No hay gastos en este período</p>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}