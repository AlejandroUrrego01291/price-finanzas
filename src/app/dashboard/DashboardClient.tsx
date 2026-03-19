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

    const transaccionesFiltradas = useMemo(() => {
        if (!fechaFiltro) return transacciones

        const fechaLimite = new Date(fechaFiltro)
        fechaLimite.setHours(23, 59, 59, 999)

        return transacciones.filter(t => new Date(t.date) <= fechaLimite)
    }, [transacciones, fechaFiltro])

    const totales = useMemo(() => {
        const ingresos = transaccionesFiltradas
            .filter(t => t.type === 'INGRESO')
            .reduce((sum, t) => sum + t.value, 0)

        const gastos = transaccionesFiltradas
            .filter(t => t.type === 'GASTO')
            .reduce((sum, t) => sum + t.value, 0)

        return { ingresos, gastos, balance: ingresos - gastos }
    }, [transaccionesFiltradas])

    const datosBarra = useMemo(() => [
        { name: 'Ingresos', valor: totales.ingresos, fill: '#10B981' },
        { name: 'Gastos', valor: totales.gastos, fill: '#EF4444' }
    ], [totales])

    const ingresosConDetalle = useMemo(() =>
        transaccionesFiltradas
            .filter(t => t.type === 'INGRESO')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        [transaccionesFiltradas])

    const gastosPorCategoriaConDetalle = useMemo(() => {
        const gastosPorCategoria: Record<string, { total: number; transacciones: Transaccion[] }> = {}

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

        Object.values(gastosPorCategoria).forEach(cat => {
            cat.transacciones.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        })

        return Object.entries(gastosPorCategoria)
            .map(([categoria, data]) => ({ categoria, total: data.total, transacciones: data.transacciones }))
            .sort((a, b) => b.total - a.total)
    }, [transaccionesFiltradas])

    const datosGastosPorCategoria = useMemo(() =>
        gastosPorCategoriaConDetalle.map(item => ({ name: item.categoria, value: item.total })),
        [gastosPorCategoriaConDetalle])

    const evolucionMensual = useMemo(() => {
        const ultimosMeses = mesesDisponibles.slice(0, 6).reverse()

        return ultimosMeses.map(mes => {
            const [año, mesNum] = mes.split('-')
            const transaccionesMes = transacciones.filter(t => {
                const fecha = new Date(t.date)
                return fecha.getFullYear() === Number(año) && fecha.getMonth() + 1 === Number(mesNum)
            })

            const ingresos = transaccionesMes.filter(t => t.type === 'INGRESO').reduce((sum, t) => sum + t.value, 0)
            const gastos = transaccionesMes.filter(t => t.type === 'GASTO').reduce((sum, t) => sum + t.value, 0)

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
            const response = await fetch(`/api/transacciones?id=${id}`, { method: 'DELETE' })
            if (response.ok) {
                router.refresh()
            } else {
                alert('No se pudo eliminar la transacción')
            }
        } catch (error) {
            console.error('Error al eliminar:', error)
            alert('Ocurrió un error al intentar eliminar')
        }
    }

    const formatearMoneda = (valor: number) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor)

    const formatearFecha = (fecha: string) =>
        new Date(fecha).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })

    // ──────────────────────────────────────────────────────────────
    // RENDER
    // ──────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Navbar */}
            <nav className="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-50 border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        <div className="flex items-center">
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                Mis finanzas
                            </h1>
                            <span className="ml-3 text-sm font-medium text-gray-600 hidden md:inline-block">Dashboard</span>
                        </div>

                        <div className="hidden md:flex items-center space-x-2">
                            <NavButton href="/transacciones" icon="💰" text="Transacciones" color="blue" />
                            <NavButton href="/conceptos" icon="📁" text="Conceptos" color="green" />
                            <NavButton href="/deudas" icon="💳" text="Deudas" color="red" />
                            <NavButton href="/ahorros" icon="🐷" text="Ahorros" color="yellow" />
                            <NavButton href="/predicciones" icon="🔮" text="Predicciones" color="purple" />
                        </div>

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
                {/* Selector de fecha y tarjetas resumen ... (sin cambios relevantes) */}

                {/* Detalle de Ingresos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                        <div className="px-6 py-5 bg-gradient-to-r from-[#10B981] to-[#059669]">
                            <h3 className="text-lg font-bold text-white flex items-center">
                                <span className="mr-2">💰</span>
                                Detalle de Ingresos
                            </h3>
                        </div>
                        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                            {ingresosConDetalle.length > 0 ? (
                                ingresosConDetalle.map(transaccion => (
                                    <div key={transaccion.id} className="px-6 py-4 hover:bg-green-50 transition-colors duration-200 group">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-gray-900">{transaccion.conceptName}</p>
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
                                                <p className="text-xs text-gray-500">{formatearFecha(transaccion.date)}</p>
                                            </div>
                                            <p className="text-sm font-bold text-[#10B981] bg-green-100 px-3 py-1 rounded-full ml-4">
                                                {formatearMoneda(transaccion.value)}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="px-6 py-12 text-center text-gray-400">No hay ingresos en este período</p>
                            )}
                        </div>
                    </div>

                    {/* Detalle de Gastos por Categoría ... (similar, sin cambios importantes en la lógica de edición) */}
                    {/* ... resto del componente igual ... */}
                </div>
            </main>
        </div>
    )
}