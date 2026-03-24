'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type SavingContribution = {
    id: string
    date: string
    amount: number
    extraAmount: number | null
    totalSaved: number
}

type Saving = {
    id: string
    concept: string
    targetAmount: number
    monthlySaving: number
    startDate: string
    isActive: boolean
    contributions: SavingContribution[]
}

type Props = {
    ahorros: Saving[]
    totalAhorrado: number
}

export default function AhorrosClient({ ahorros: ahorrosIniciales, totalAhorrado: totalInicial }: Props) {
    const router = useRouter()
    const [ahorros, setAhorros] = useState<Saving[]>(ahorrosIniciales)
    const [totalAhorrado, setTotalAhorrado] = useState(totalInicial)
    const [showForm, setShowForm] = useState(false)
    const [formData, setFormData] = useState({
        concept: '',
        targetAmount: '',
        monthlySaving: '',
        startDate: new Date().toISOString().split('T')[0]
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            const response = await fetch('/api/ahorros', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    concept: formData.concept,
                    targetAmount: Number(formData.targetAmount),
                    monthlySaving: Number(formData.monthlySaving),
                    startDate: formData.startDate
                })
            })

            if (response.ok) {
                const nuevoAhorro = await response.json()
                const ahorroConvertido = {
                    id: nuevoAhorro.id,
                    concept: nuevoAhorro.concept,
                    targetAmount: nuevoAhorro.targetAmount,
                    monthlySaving: nuevoAhorro.monthlySaving,
                    startDate: new Date(nuevoAhorro.startDate).toISOString().split('T')[0],
                    isActive: nuevoAhorro.isActive,
                    contributions: []
                }
                setAhorros([ahorroConvertido, ...ahorros])
                setFormData({
                    concept: '',
                    targetAmount: '',
                    monthlySaving: '',
                    startDate: new Date().toISOString().split('T')[0]
                })
                setShowForm(false)
                router.refresh()
            }
        } catch (error) {
            console.error('Error:', error)
        }
    }

    const handleRegisterContribution = async (savingId: string, contributionData: any) => {
        console.log('📌 Iniciando registro de aporte para:', savingId)

        try {
            const response = await fetch('/api/ahorros/contribuciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    savingId,
                    ...contributionData
                })
            })

            if (response.ok) {
                const ahorroActualizado = await response.json()
                console.log('📌 Datos recibidos del servidor:', ahorroActualizado)

                // Obtener la contribución más reciente (primera en el array)
                const contribucionMasReciente = ahorroActualizado.contributions[0]
                const nuevoTotalAhorrado = contribucionMasReciente?.totalSaved ?? 0

                console.log('📌 Nuevo total ahorrado para esta meta:', nuevoTotalAhorrado)

                // Actualizar la lista de ahorros
                setAhorros(prev => {
                    const nuevosAhorros = prev.map(a => {
                        if (a.id === savingId) {
                            // Convertir las contribuciones para que tengan la fecha en formato string
                            const contribucionesConvertidas = ahorroActualizado.contributions.map((c: any) => ({
                                ...c,
                                date: new Date(c.date).toISOString().split('T')[0]
                            }))

                            return {
                                ...ahorroActualizado,
                                startDate: new Date(ahorroActualizado.startDate).toISOString().split('T')[0],
                                contributions: contribucionesConvertidas
                            }
                        }
                        return a
                    })
                    return nuevosAhorros
                })

                // Recalcular el total general de todos los ahorros
                setTotalAhorrado(prevTotal => {
                    const nuevoTotalGeneral = ahorros.reduce((sum, a) => {
                        if (a.id === savingId) {
                            return sum + nuevoTotalAhorrado
                        }
                        const ultima = a.contributions[0]
                        return sum + (ultima?.totalSaved ?? 0)
                    }, 0)
                    console.log('📌 Nuevo total general de ahorros:', nuevoTotalGeneral)
                    return nuevoTotalGeneral
                })

                router.refresh()
            } else {
                const errorText = await response.text()
                console.error('❌ Error del servidor:', response.status, errorText)
            }
        } catch (error) {
            console.error('❌ Error en la petición:', error)
        }
    }

    const obtenerAhorrado = (ahorro: Saving) => {
        return ahorro.contributions[0]?.totalSaved ?? 0
    }

    const obtenerRestante = (ahorro: Saving) => {
        const ahorrado = obtenerAhorrado(ahorro)
        return ahorro.targetAmount - ahorrado
    }

    const calcularProgreso = (ahorro: Saving) => {
        const ahorrado = obtenerAhorrado(ahorro)
        return (ahorrado / ahorro.targetAmount) * 100
    }

    const calcularTiempoParaMeta = (ahorro: Saving) => {
        const restante = obtenerRestante(ahorro)
        if (restante <= 0) return { meses: 0, fecha: 'Meta alcanzada' }
        const meses = Math.ceil(restante / ahorro.monthlySaving)
        const fecha = new Date()
        fecha.setMonth(fecha.getMonth() + meses)
        return { meses, fecha: fecha.toLocaleDateString('es-CO') }
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
            month: 'long',
            day: 'numeric'
        })
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <nav className="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-50 border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        <div className="flex items-center">
                            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                Mis finanzas
                            </h1>
                            <span className="ml-3 text-sm font-medium text-gray-600 hidden md:inline-block">
                                Ahorros
                            </span>
                        </div>
                        <div className="flex items-center">
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="px-4 py-2 md:px-5 md:py-2.5 text-sm font-medium text-gray-700 hover:text-white border-2 border-gray-300 rounded-full hover:bg-gray-600 hover:border-gray-600 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg flex items-center space-x-2"
                            >
                                <span>←</span>
                                <span className="hidden md:inline">Volver al Dashboard</span>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="mb-6 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-800">Mis Metas de Ahorro</h2>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        {showForm ? 'Cancelar' : '+ Nueva Meta'}
                    </button>
                </div>

                {showForm && (
                    <div className="bg-white shadow rounded-lg p-6 mb-6">
                        <h3 className="text-lg font-medium mb-4">Crear Nueva Meta de Ahorro</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Concepto</label>
                                    <input
                                        type="text"
                                        value={formData.concept}
                                        onChange={(e) => setFormData({ ...formData, concept: e.target.value })}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                        placeholder="Ej: Vacaciones, Emergencias, Casa..."
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Meta (Valor objetivo)</label>
                                    <input
                                        type="number"
                                        value={formData.targetAmount}
                                        onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                        placeholder="0"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Ahorro Mensual</label>
                                    <input
                                        type="number"
                                        value={formData.monthlySaving}
                                        onChange={(e) => setFormData({ ...formData, monthlySaving: e.target.value })}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                        placeholder="0"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Fecha de Inicio</label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                                    Guardar Meta
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="bg-white shadow rounded-lg p-6 mb-6">
                    <p className="text-sm text-gray-600">Tus ahorros suman:</p>
                    <p className="text-3xl font-bold text-green-600" suppressHydrationWarning>
                        {formatearMoneda(totalAhorrado)}
                    </p>
                </div>

                <div className="space-y-6">
                    {ahorros.map((ahorro) => {
                        const ahorrado = obtenerAhorrado(ahorro)
                        const restante = obtenerRestante(ahorro)
                        const progreso = calcularProgreso(ahorro)
                        const tiempoMeta = calcularTiempoParaMeta(ahorro)

                        return (
                            <div key={ahorro.id} className="bg-white shadow rounded-lg overflow-hidden">
                                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900" suppressHydrationWarning>
                                                {ahorro.concept}
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                Inicio: {formatearFecha(ahorro.startDate)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-600">Progreso</p>
                                            <p className="text-xl font-bold text-green-600" suppressHydrationWarning>
                                                {progreso.toFixed(1)}%
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="px-6 py-4">
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div
                                            className="bg-green-600 h-2.5 rounded-full"
                                            style={{ width: `${Math.min(progreso, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-4 gap-4 bg-white">
                                    <div>
                                        <p className="text-xs text-gray-500">Meta</p>
                                        <p className="text-sm font-medium">{formatearMoneda(ahorro.targetAmount)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Ahorrado</p>
                                        <p className="text-sm font-medium text-green-600" suppressHydrationWarning>
                                            {formatearMoneda(ahorrado)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Faltan</p>
                                        <p className="text-sm font-medium">{formatearMoneda(restante)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Tiempo estimado</p>
                                        <p className="text-sm font-medium">
                                            {tiempoMeta.meses > 0
                                                ? `${tiempoMeta.meses} meses (${tiempoMeta.fecha})`
                                                : tiempoMeta.fecha}
                                        </p>
                                    </div>
                                </div>

                                {ahorro.contributions.length > 0 && (
                                    <div className="border-t border-gray-200">
                                        <div className="px-6 py-3 bg-gray-50">
                                            <h4 className="text-sm font-medium text-gray-700">Historial de Aportes</h4>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aporte Mensual</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aporte Extra</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Ahorrado</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {ahorro.contributions.map((contribucion) => (
                                                        <tr key={contribucion.id} className="hover:bg-gray-50">
                                                            <td className="px-6 py-2 text-sm">{formatearFecha(contribucion.date)}</td>
                                                            <td className="px-6 py-2 text-sm">{formatearMoneda(contribucion.amount)}</td>
                                                            <td className="px-6 py-2 text-sm">{contribucion.extraAmount ? formatearMoneda(contribucion.extraAmount) : '-'}</td>
                                                            <td className="px-6 py-2 text-sm font-medium">{formatearMoneda(contribucion.totalSaved)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                                    <button
                                        onClick={() => {
                                            const aporteExtra = prompt('¿Deseas hacer un aporte extra? (Deja en blanco si no)', '0')
                                            const fecha = prompt('Fecha del aporte (YYYY-MM-DD)', new Date().toISOString().split('T')[0])
                                            if (fecha) {
                                                handleRegisterContribution(ahorro.id, {
                                                    date: fecha,
                                                    extraAmount: aporteExtra ? Number(aporteExtra) : 0
                                                })
                                            }
                                        }}
                                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                    >
                                        Registrar Aporte Mensual
                                    </button>
                                </div>
                            </div>
                        )
                    })}

                    {ahorros.length === 0 && (
                        <div className="bg-white shadow rounded-lg p-12 text-center">
                            <p className="text-gray-500">No tienes metas de ahorro</p>
                            <button
                                onClick={() => setShowForm(true)}
                                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Crear primera meta
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}