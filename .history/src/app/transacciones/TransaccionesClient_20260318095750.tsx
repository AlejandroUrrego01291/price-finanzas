'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

type Concepto = {
    id: string
    type: string
    name: string
    category: string | null
    subType: string | null
    value: number | null
    fixedDate: number | null
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
    const [mostrarFormNuevoConcepto, setMostrarFormNuevoConcepto] = useState(false)
    const [nuevoConcepto, setNuevoConcepto] = useState('')

    const [transacciones, setTransacciones] = useState(transaccionesIniciales)
    const [totalIngresos, setTotalIngresos] = useState(totalIngresosInicial)
    const [totalGastos, setTotalGastos] = useState(totalGastosInicial)

    // Separar transacciones por tipo
    const ingresos = transacciones.filter(t => t.type === 'INGRESO')
    const gastos = transacciones.filter(t => t.type === 'GASTO')

    // Filtrar conceptos según el tipo seleccionado
    const conceptosFiltrados = conceptos.filter(c => c.type === tipo)

    // Cuando se selecciona un concepto, auto-completar el valor si existe
    const handleConceptoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value
        setConceptoId(id)

        const concepto = conceptos.find(c => c.id === id)
        if (concepto?.value) {
            setValor(concepto.value.toString())
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        let conceptoFinalId = conceptoId
        let conceptoFinalNombre = ''
        let categoriaFinal = ''
        let subTipoFinal = ''

        // Si es un concepto nuevo, crearlo primero
        if (mostrarFormNuevoConcepto && nuevoConcepto) {
            try {
                const response = await fetch('/api/conceptos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: tipo,
                        name: nuevoConcepto,
                        category: 'No planeados',
                        subType: 'CASUAL',
                        value: valor ? Number(valor) : null,
                        fixedDate: null
                    })
                })

                if (response.ok) {
                    const conceptoNuevo = await response.json()
                    conceptoFinalId = conceptoNuevo.id
                    conceptoFinalNombre = conceptoNuevo.name
                    categoriaFinal = 'No planeados'
                    subTipoFinal = 'CASUAL'

                    // Recargar conceptos
                    router.refresh()
                }
            } catch (error) {
                console.error('Error creando concepto:', error)
                return
            }
        } else {
            const concepto = conceptos.find(c => c.id === conceptoId)
            if (!concepto) return
            conceptoFinalNombre = concepto.name
            categoriaFinal = concepto.category || 'No planeados'
            subTipoFinal = concepto.subType || 'CASUAL'
        }

        try {
            const response = await fetch('/api/transacciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: tipo,
                    conceptId: conceptoFinalId,
                    conceptName: conceptoFinalNombre,
                    value: Number(valor),
                    date: fecha,
                    category: categoriaFinal,
                    subType: subTipoFinal
                })
            })

            if (response.ok) {
                const nuevaTransaccion = await response.json()

                setTransacciones([nuevaTransaccion, ...transacciones])

                if (tipo === 'INGRESO') {
                    setTotalIngresos(totalIngresos + Number(valor))
                } else {
                    setTotalGastos(totalGastos + Number(valor))
                }

                setConceptoId('')
                setValor('')
                setNuevoConcepto('')
                setMostrarFormNuevoConcepto(false)
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
        < div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" >
            {/* Navbar moderno con efecto glassmorphism - MISMO ESTILO QUE EL DASHBOARD */}
            < nav className="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-50 border-b border-gray-200" >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        {/* Logo con gradiente */}
                        <div className="flex items-center">
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                Mis finanzas
                            </h1>
                            <span className="ml-3 text-sm font-medium text-gray-600 hidden md:inline-block">
                                Administrar Conceptos
                            </span>
                        </div>

                        {/* Botón de volver con el mismo estilo de los botones de navegación */}
                        <div className="flex items-center">
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:text-white border-2 border-gray-300 rounded-full hover:bg-gray-600 hover:border-gray-600 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg flex items-center space-x-2"
                            >
                                <span>←</span>
                                <span className="hidden md:inline">Volver al Dashboard</span>
                            </button>
                        </div>
                    </div>
                </div>
            </nav >

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {/* Formulario de transacciones */}
                <div className="bg-white shadow rounded-lg p-6 mb-6">
                    <h2 className="text-subtitle text-lg mb-4">Nueva Transacción</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Selector de Tipo */}
                            <div>
                                <label className="block text-body text-sm font-medium mb-1">
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

                            {/* Selector de Concepto o Nuevo Concepto */}
                            <div className="col-span-2">
                                {!mostrarFormNuevoConcepto ? (
                                    <>
                                        <label className="block text-body text-sm font-medium mb-1">
                                            Concepto
                                        </label>
                                        <select
                                            value={conceptoId}
                                            onChange={handleConceptoChange}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                            required={!mostrarFormNuevoConcepto}
                                        >
                                            <option value="">Selecciona un concepto</option>
                                            {conceptosFiltrados.map(concepto => (
                                                <option key={concepto.id} value={concepto.id}>
                                                    {concepto.name} {concepto.value ? `(${formatearMoneda(concepto.value)})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </>
                                ) : (
                                    <>
                                        <label className="block text-body text-sm font-medium mb-1">
                                            Nuevo Concepto
                                        </label>
                                        <input
                                            type="text"
                                            value={nuevoConcepto}
                                            onChange={(e) => setNuevoConcepto(e.target.value)}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                            placeholder="Nombre del nuevo concepto"
                                            required
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Se asignará categoría "No planeados" y subtipo "Casual"
                                        </p>
                                    </>
                                )}
                            </div>

                            {/* Botón para nuevo concepto */}
                            <div className="flex items-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMostrarFormNuevoConcepto(!mostrarFormNuevoConcepto)
                                        setConceptoId('')
                                        setNuevoConcepto('')
                                    }}
                                    className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                                >
                                    {mostrarFormNuevoConcepto ? 'Usar existente' : '+ Nuevo concepto'}
                                </button>
                            </div>

                            {/* Valor */}
                            <div>
                                <label className="block text-body text-sm font-medium mb-1">
                                    Valor
                                </label>
                                <input
                                    type="number"
                                    value={valor}
                                    onChange={(e) => setValor(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                    placeholder="0"
                                    required
                                />
                            </div>

                            {/* Fecha */}
                            <div>
                                <label className="block text-body text-sm font-medium mb-1">
                                    Fecha
                                </label>
                                <input
                                    type="date"
                                    value={fecha}
                                    onChange={(e) => setFecha(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                    required
                                />
                            </div>

                            {/* Botón Guardar */}
                            <div className="flex items-end">
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    Guardar
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Resumen del mes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm text-green-700 font-medium">Total Ingresos</p>
                        <p className="text-2xl font-bold text-green-700">{formatearMoneda(totalIngresos)}</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm text-red-700 font-medium">Total Gastos</p>
                        <p className="text-2xl font-bold text-red-700">{formatearMoneda(totalGastos)}</p>
                    </div>
                </div>

                {/* Listados separados */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Ingresos */}
                    <div className="bg-white shadow rounded-lg overflow-hidden">
                        <div className="px-6 py-4 bg-green-50 border-b border-green-200">
                            <h3 className="text-subtitle text-green-800">Ingresos</h3>
                        </div>
                        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                            {ingresos.map((transaccion) => (
                                <div key={transaccion.id} className="px-6 py-3 hover:bg-gray-50">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{transaccion.conceptName}</p>
                                            <p className="text-xs text-gray-500">
                                                {new Date(transaccion.date).toLocaleDateString('es-CO')}
                                            </p>
                                        </div>
                                        <p className="text-sm font-medium text-green-600">
                                            {formatearMoneda(transaccion.value)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {ingresos.length === 0 && (
                                <p className="px-6 py-8 text-center text-gray-500">No hay ingresos este mes</p>
                            )}
                        </div>
                    </div>

                    {/* Gastos */}
                    <div className="bg-white shadow rounded-lg overflow-hidden">
                        <div className="px-6 py-4 bg-red-50 border-b border-red-200">
                            <h3 className="text-subtitle text-red-800">Gastos</h3>
                        </div>
                        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                            {gastos.map((transaccion) => (
                                <div key={transaccion.id} className="px-6 py-3 hover:bg-gray-50">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{transaccion.conceptName}</p>
                                            <p className="text-xs text-gray-500">
                                                {new Date(transaccion.date).toLocaleDateString('es-CO')}
                                            </p>
                                        </div>
                                        <p className="text-sm font-medium text-red-600">
                                            {formatearMoneda(transaccion.value)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {gastos.length === 0 && (
                                <p className="px-6 py-8 text-center text-gray-500">No hay gastos este mes</p>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div >
    )
}