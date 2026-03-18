'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Concepto = {
    id: string
    type: string
    name: string
    category: string | null
    subType: string | null
}

type Transaccion = {
    id: string
    type: string
    conceptName: string
    value: number
    date: string
    category: string | null
    subType: string | null
    concept: Concepto | null
}

type Props = {
    conceptos: Concepto[]
    transacciones: Transaccion[]
    totalIngresos: number
    totalGastos: number
}

export default function TransaccionesClient({
    conceptos,
    transacciones: transaccionesIniciales,
    totalIngresos: totalIngresosInicial,
    totalGastos: totalGastosInicial
}: Props) {
    const router = useRouter()
    const [tipo, setTipo] = useState<'INGRESO' | 'GASTO'>('INGRESO')
    const [conceptoId, setConceptoId] = useState('')
    const [valor, setValor] = useState('')
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
    const [transacciones, setTransacciones] = useState(transaccionesIniciales)
    const [totalIngresos, setTotalIngresos] = useState(totalIngresosInicial)
    const [totalGastos, setTotalGastos] = useState(totalGastosInicial)

    // Filtrar conceptos según el tipo seleccionado
    const conceptosFiltrados = conceptos.filter(c => c.type === tipo)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const concepto = conceptos.find(c => c.id === conceptoId)
        if (!concepto) return

        try {
            const response = await fetch('/api/transacciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: tipo,
                    conceptId: conceptoId,
                    conceptName: concepto.name,
                    value: Number(valor),
                    date: fecha,
                    category: concepto.category,
                    subType: concepto.subType
                })
            })

            if (response.ok) {
                const nuevaTransaccion = await response.json()

                // Actualizar estado local
                setTransacciones([nuevaTransaccion, ...transacciones])

                // Actualizar totales
                if (tipo === 'INGRESO') {
                    setTotalIngresos(totalIngresos + Number(valor))
                } else {
                    setTotalGastos(totalGastos + Number(valor))
                }

                // Limpiar formulario
                setConceptoId('')
                setValor('')
                setFecha(new Date().toISOString().split('T')[0])

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

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-xl font-semibold text-gray-900">Price - Registro de Transacciones</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="text-sm text-gray-600 hover:text-gray-900"
                            >
                                ← Volver al Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {/* Formulario de transacciones */}
                <div className="bg-white shadow rounded-lg p-6 mb-6">
                    <h2 className="text-lg font-medium mb-4">Nueva Transacción</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Selector de Tipo */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tipo
                                </label>
                                <div className="flex rounded-md shadow-sm">
                                    <button
                                        type="button"
                                        onClick={() => setTipo('INGRESO')}
                                        className={`flex-1 px-4 py-2 text-sm font-medium rounded-l-md border ${tipo === 'INGRESO'
                                                ? 'bg-green-600 text-white border-green-600'
                                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        Ingreso
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTipo('GASTO')}
                                        className={`flex-1 px-4 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${tipo === 'GASTO'
                                                ? 'bg-red-600 text-white border-red-600'
                                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        Gasto
                                    </button>
                                </div>
                            </div>

                            {/* Selector de Concepto (condicional) */}
                            <div>
                                <label htmlFor="concepto" className="block text-sm font-medium text-gray-700 mb-1">
                                    Concepto
                                </label>
                                <select
                                    id="concepto"
                                    value={conceptoId}
                                    onChange={(e) => setConceptoId(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    required
                                >
                                    <option value="">Selecciona un concepto</option>
                                    {conceptosFiltrados.map(concepto => (
                                        <option key={concepto.id} value={concepto.id}>
                                            {concepto.name} {concepto.category ? `(${concepto.category})` : ''}
                                        </option>
                                    ))}
                                </select>
                                {conceptosFiltrados.length === 0 && (
                                    <p className="mt-1 text-xs text-red-600">
                                        No hay conceptos de {tipo === 'INGRESO' ? 'ingreso' : 'gasto'}.
                                        <a href="/conceptos" className="underline ml-1">Crea uno aquí</a>
                                    </p>
                                )}
                            </div>

                            {/* Campo Valor */}
                            <div>
                                <label htmlFor="valor" className="block text-sm font-medium text-gray-700 mb-1">
                                    Valor
                                </label>
                                <input
                                    type="number"
                                    id="valor"
                                    value={valor}
                                    onChange={(e) => setValor(e.target.value)}
                                    min="0"
                                    step="100"
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="0"
                                    required
                                />
                            </div>

                            {/* Campo Fecha */}
                            <div>
                                <label htmlFor="fecha" className="block text-sm font-medium text-gray-700 mb-1">
                                    Fecha
                                </label>
                                <input
                                    type="date"
                                    id="fecha"
                                    value={fecha}
                                    onChange={(e) => setFecha(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                        </div>

                        {/* Botón Guardar */}
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                disabled={conceptosFiltrados.length === 0}
                            >
                                Guardar Transacción
                            </button>
                        </div>
                    </form>
                </div>

                {/* Resumen del mes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm text-green-600 font-medium">Total Ingresos</p>
                        <p className="text-2xl font-bold text-green-700">{formatearMoneda(totalIngresos)}</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm text-red-600 font-medium">Total Gastos</p>
                        <p className="text-2xl font-bold text-red-700">{formatearMoneda(totalGastos)}</p>
                    </div>
                </div>

                {/* Listado de transacciones */}
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium">Transacciones del Mes</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Concepto</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subtipo</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {transacciones.map((transaccion) => (
                                    <tr key={transaccion.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {new Date(transaccion.date).toLocaleDateString('es-CO')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${transaccion.type === 'INGRESO'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                }`}>
                                                {transaccion.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {transaccion.conceptName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {transaccion.category || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {transaccion.subType || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                                            <span className={transaccion.type === 'INGRESO' ? 'text-green-600' : 'text-red-600'}>
                                                {formatearMoneda(transaccion.value)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {transacciones.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                            No hay transacciones registradas este mes
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    )
}