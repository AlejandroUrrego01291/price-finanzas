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
    const [editandoAhorro, setEditandoAhorro] = useState<Saving | null>(null)
    const [formData, setFormData] = useState({
        concept: '',
        targetAmount: '',
        monthlySaving: '',
        startDate: new Date().toISOString().split('T')[0]
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            const url = editandoAhorro ? `/api/ahorros?id=${editandoAhorro.id}` : '/api/ahorros'
            const method = editandoAhorro ? 'PUT' : 'POST'

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    concept: formData.concept,
                    targetAmount: Number(formData.targetAmount),
                    monthlySaving: Number(formData.monthlySaving),
                    startDate: formData.startDate
                })
            })

            if (response.ok) {
                if (editandoAhorro) {
                    router.refresh()
                } else {
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
                }

                setFormData({
                    concept: '',
                    targetAmount: '',
                    monthlySaving: '',
                    startDate: new Date().toISOString().split('T')[0]
                })
                setEditandoAhorro(null)
                setShowForm(false)
                router.refresh()
            }
        } catch (error) {
            console.error('Error:', error)
        }
    }

    const handleEditSaving = (ahorro: Saving) => {
        setEditandoAhorro(ahorro)
        setFormData({
            concept: ahorro.concept,
            targetAmount: ahorro.targetAmount.toString(),
            monthlySaving: ahorro.monthlySaving.toString(),
            startDate: ahorro.startDate
        })
        setShowForm(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleDeleteSaving = async (id: string) => {
        if (!confirm('¿Eliminar esta meta de ahorro y todo su historial?')) return
        try {
            const response = await fetch(`/api/ahorros?id=${id}`, { method: 'DELETE' })
            if (response.ok) {
                setAhorros(ahorros.filter(a => a.id !== id))
                router.refresh()
            }
        } catch (error) {
            console.error('Error:', error)
        }
    }

    const handleRegisterContribution = async (savingId: string, contributionData: any) => {
        try {
            const response = await fetch('/api/ahorros/contribuciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ savingId, ...contributionData })
            })

            if (response.ok) {
                router.refresh()
            }
        } catch (error) {
            console.error('Error:', error)
        }
    }

    const handleDeleteContribution = async (savingId: string, contributionId: string) => {
        if (!confirm('¿Eliminar este aporte? Se recalculará el total automáticamente.')) return
        try {
            const response = await fetch(`/api/ahorros/contribuciones?savingId=${savingId}&contributionId=${contributionId}`, { method: 'DELETE' })
            if (response.ok) {
                router.refresh()
            }
        } catch (error) {
            console.error('Error:', error)
        }
    }

    const handleCancelEdit = () => {
        setEditandoAhorro(null)
        setFormData({
            concept: '',
            targetAmount: '',
            monthlySaving: '',
            startDate: new Date().toISOString().split('T')[0]
        })
        setShowForm(false)
    }

    const obtenerAhorrado = (ahorro: Saving) => {
        return ahorro.contributions[0]?.totalSaved ?? 0
    }

    const obtenerRestante = (ahorro: Saving) => {
        return ahorro.targetAmount - obtenerAhorrado(ahorro)
    }

    const calcularProgreso = (ahorro: Saving) => {
        return (obtenerAhorrado(ahorro) / ahorro.targetAmount) * 100
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
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {/* Botón Nueva Meta */}
                <div className="mb-6 flex justify-end">
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        {showForm ? 'Cancelar' : '+ Nueva Meta'}
                    </button>
                </div>

                {/* Formulario nueva/editar meta */}
                {showForm && (
                    <div className="bg-white shadow rounded-lg p-6 mb-6">
                        <h3 className="text-lg font-medium mb-4">
                            {editandoAhorro ? 'Editar Meta de Ahorro' : 'Crear Nueva Meta de Ahorro'}
                        </h3>
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
                            <div className="flex justify-end space-x-2">
                                {editandoAhorro && (
                                    <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                                    >
                                        Cancelar
                                    </button>
                                )}
                                <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                                    {editandoAhorro ? 'Actualizar' : 'Guardar Meta'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Total ahorrado */}
                <div className="bg-white shadow rounded-lg p-6 mb-6">
                    <p className="text-sm text-gray-600">Tus ahorros suman:</p>
                    <p className="text-3xl font-bold text-green-600">{formatearMoneda(totalAhorrado)}</p>
                </div>

                {/* Listado de metas */}
                <div className="space-y-6">
                    {ahorros.map((ahorro) => {
                        const ahorrado = obtenerAhorrado(ahorro)
                        const restante = obtenerRestante(ahorro)
                        const progreso = calcularProgreso(ahorro)
                        const tiempoMeta = calcularTiempoParaMeta(ahorro)

                        return (
                            <div key={ahorro.id} className="bg-white shadow rounded-lg overflow-hidden">
                                {/* Cabecera de la meta */}
                                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3">
                                                <h3 className="text-lg font-medium text-gray-900">{ahorro.concept}</h3>
                                                <button
                                                    onClick={() => handleEditSaving(ahorro)}
                                                    className="text-blue-600 hover:text-blue-800 text-sm"
                                                    title="Editar meta"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteSaving(ahorro.id)}
                                                    className="text-red-600 hover:text-red-800 text-sm"
                                                    title="Eliminar meta"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                Inicio: {formatearFecha(ahorro.startDate)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-600">Progreso</p>
                                            <p className="text-xl font-bold text-green-600">{progreso.toFixed(1)}%</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Barra de progreso */}
                                <div className="px-6 py-4">
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div
                                            className="bg-green-600 h-2.5 rounded-full"
                                            style={{ width: `${Math.min(progreso, 100)}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Detalles de la meta */}
                                <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-4 gap-4 bg-white">
                                    <div>
                                        <p className="text-xs text-gray-500">Meta</p>
                                        <p className="text-sm font-medium">{formatearMoneda(ahorro.targetAmount)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Ahorrado</p>
                                        <p className="text-sm font-medium text-green-600">{formatearMoneda(ahorrado)}</p>
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

                                {/* Tabla de contribuciones */}
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
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {ahorro.contributions.map((contribucion) => (
                                                        <tr key={contribucion.id} className="hover:bg-gray-50">
                                                            <td className="px-6 py-2 text-sm">{formatearFecha(contribucion.date)}</td>
                                                            <td className="px-6 py-2 text-sm">{formatearMoneda(contribucion.amount)}</td>
                                                            <td className="px-6 py-2 text-sm">{contribucion.extraAmount ? formatearMoneda(contribucion.extraAmount) : '-'}</td>
                                                            <td className="px-6 py-2 text-sm font-medium">{formatearMoneda(contribucion.totalSaved)}</td>
                                                            <td className="px-6 py-2 text-sm">
                                                                <button
                                                                    onClick={() => handleDeleteContribution(ahorro.id, contribucion.id)}
                                                                    className="text-red-600 hover:text-red-800"
                                                                    title="Eliminar aporte"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Botón para registrar aporte */}
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