'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// ============================================
// TIPOS
// ============================================
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
// ============================================

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
    const [editandoId, setEditandoId] = useState<string | null>(null)

    const [transacciones, setTransacciones] = useState<Transaccion[]>(transaccionesIniciales)
    const [totalIngresos, setTotalIngresos] = useState(totalIngresosInicial)
    const [totalGastos, setTotalGastos] = useState(totalGastosInicial)

    // Separar transacciones por tipo
    const ingresos = transacciones.filter(t => t.type === 'INGRESO')
    const gastos = transacciones.filter(t => t.type === 'GASTO')

    // Filtrar conceptos según el tipo seleccionado
    const conceptosFiltrados = conceptos.filter(c => c.type === tipo)

    // ===== Leer parámetro de edición de la URL =====
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search)
            const editId = params.get('edit')

            if (editId) {
                console.log('Editando transacción:', editId)
                const transaccion = transacciones.find(t => t.id === editId)

                if (transaccion) {
                    console.log('Transacción encontrada:', transaccion)
                    setEditandoId(transaccion.id)
                    setTipo(transaccion.type as 'INGRESO' | 'GASTO')
                    setConceptoId(transaccion.concept?.id || '')
                    setValor(transaccion.value.toString())
                    setFecha(transaccion.date)
                    setMostrarFormNuevoConcepto(false)

                    const url = new URL(window.location.href)
                    url.searchParams.delete('edit')
                    window.history.replaceState({}, '', url.toString())

                    window.scrollTo({ top: 0, behavior: 'smooth' })
                } else {
                    console.log('Transacción no encontrada con ID:', editId)
                }
            }
        }
    }, [transacciones])

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

                    router.refresh()
                } else {
                    console.error('Error creando concepto')
                    return
                }
            } catch (error) {
                console.error('Error creando concepto:', error)
                return
            }
        } else {
            const concepto = conceptos.find(c => c.id === conceptoId)
            if (!concepto) {
                console.error('Concepto no encontrado')
                return
            }
            conceptoFinalNombre = concepto.name
            categoriaFinal = concepto.category || 'No planeados'
            subTipoFinal = concepto.subType || 'CASUAL'
        }

        try {
            const url = editandoId ? `/api/transacciones?id=${editandoId}` : '/api/transacciones'
            const method = editandoId ? 'PUT' : 'POST'

            const payload = {
                id: editandoId,
                type: tipo,
                conceptId: conceptoFinalId,
                conceptName: conceptoFinalNombre,
                value: Number(valor),
                date: fecha,
                category: categoriaFinal,
                subType: subTipoFinal
            }

            console.log('Enviando payload:', payload)

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (response.ok) {
                const transaccionActualizada = await response.json()
                console.log('Transacción actualizada:', transaccionActualizada)

                if (editandoId) {
                    // Actualizar la transacción existente
                    const nuevasTransacciones = transacciones.map(t =>
                        t.id === editandoId ? transaccionActualizada : t
                    )
                    setTransacciones(nuevasTransacciones)

                    // Recalcular totales desde cero con las nuevas transacciones
                    const nuevosIngresos = nuevasTransacciones
                        .filter(t => t.type === 'INGRESO')
                        .reduce((sum, t) => sum + t.value, 0)

                    const nuevosGastos = nuevasTransacciones
                        .filter(t => t.type === 'GASTO')
                        .reduce((sum, t) => sum + t.value, 0)

                    setTotalIngresos(nuevosIngresos)
                    setTotalGastos(nuevosGastos)
                    setEditandoId(null)
                } else {
                    // Agregar nueva transacción
                    setTransacciones([transaccionActualizada, ...transacciones])
                    if (tipo === 'INGRESO') {
                        setTotalIngresos(totalIngresos + Number(valor))
                    } else {
                        setTotalGastos(totalGastos + Number(valor))
                    }
                }

                // Limpiar formulario
                setConceptoId('')
                setValor('')
                setNuevoConcepto('')
                setMostrarFormNuevoConcepto(false)
                setFecha(new Date().toISOString().split('T')[0])

                router.refresh()
            } else {
                const errorData = await response.text()
                console.error('Error en respuesta:', response.status, errorData)
                alert('Error al guardar la transacción. Revisa la consola para más detalles.')
            }
        } catch (error) {
            console.error('Error en fetch:', error)
            alert('Error de conexión al servidor.')
        }
    }

    const handleEdit = (transaccion: Transaccion) => {
        console.log('handleEdit llamado con:', transaccion)
        setEditandoId(transaccion.id)
        setTipo(transaccion.type as 'INGRESO' | 'GASTO')
        setConceptoId(transaccion.concept?.id || '')
        setValor(transaccion.value.toString())
        setFecha(transaccion.date)
        setMostrarFormNuevoConcepto(false)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta transacción?')) return

        try {
            const response = await fetch(`/api/transacciones?id=${id}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                const transaccionEliminada = transacciones.find(t => t.id === id)

                if (transaccionEliminada) {
                    if (transaccionEliminada.type === 'INGRESO') {
                        setTotalIngresos(totalIngresos - transaccionEliminada.value)
                    } else {
                        setTotalGastos(totalGastos - transaccionEliminada.value)
                    }
                }

                setTransacciones(transacciones.filter(t => t.id !== id))

                if (editandoId === id) {
                    setEditandoId(null)
                    setConceptoId('')
                    setValor('')
                    setFecha(new Date().toISOString().split('T')[0])
                }

                router.refresh()
            } else {
                alert('Error al eliminar la transacción')
            }
        } catch (error) {
            console.error('Error:', error)
            alert('Error de conexión al servidor.')
        }
    }

    const handleCancelEdit = () => {
        setEditandoId(null)
        setConceptoId('')
        setValor('')
        setFecha(new Date().toISOString().split('T')[0])
        setMostrarFormNuevoConcepto(false)
        setNuevoConcepto('')
    }

    const formatearMoneda = (valor: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(valor)
    }

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
                            <span className="ml-3 text-sm font-medium text-gray-600 hidden md:inline-block">
                                Transacciones
                            </span>
                        </div>
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
            </nav>

            <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                {/* Formulario */}
                <div className="bg-white shadow rounded-lg p-6 mb-6">
                    <h2 className="text-subtitle text-lg mb-4">
                        {editandoId ? 'Editar Transacción' : 'Nueva Transacción'}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Selector de Tipo */}
                            <div>
                                <label className="block text-body text-sm font-medium mb-1">Tipo</label>
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
                                        <label className="block text-body text-sm font-medium mb-1">Concepto</label>
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
                                        <label className="block text-body text-sm font-medium mb-1">Nuevo Concepto</label>
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
                                <label className="block text-body text-sm font-medium mb-1">Valor</label>
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
                                <label className="block text-body text-sm font-medium mb-1">Fecha</label>
                                <input
                                    type="date"
                                    value={fecha}
                                    onChange={(e) => setFecha(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                    required
                                />
                            </div>

                            {/* Botones Guardar/Cancelar */}
                            <div className="flex items-end space-x-2">
                                {editandoId && (
                                    <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                                    >
                                        Cancelar
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    {editandoId ? 'Actualizar' : 'Guardar'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Resumen del mes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-[#10B981] to-[#059669] rounded-2xl shadow-xl p-6">
                        <p className="text-white/80 text-sm font-medium uppercase">Total Ingresos</p>
                        <p className="text-3xl font-bold text-white mt-2">{formatearMoneda(totalIngresos)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-[#EF4444] to-[#DC2626] rounded-2xl shadow-xl p-6">
                        <p className="text-white/80 text-sm font-medium uppercase">Total Gastos</p>
                        <p className="text-3xl font-bold text-white mt-2">{formatearMoneda(totalGastos)}</p>
                    </div>
                </div>

                {/* Listados separados con acciones */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Ingresos */}
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                        <div className="px-6 py-5 bg-gradient-to-r from-[#10B981] to-[#059669]">
                            <h3 className="text-lg font-bold text-white flex items-center">
                                <span className="mr-2">💰</span>
                                Ingresos
                            </h3>
                        </div>
                        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                            {ingresos.map((transaccion) => (
                                <div key={transaccion.id} className="px-6 py-4 flex justify-between items-center hover:bg-green-50 transition-colors duration-200 group">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900">{transaccion.conceptName}</p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(transaccion.date).toLocaleDateString('es-CO')}
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <p className="text-sm font-bold text-[#10B981] bg-green-100 px-3 py-1 rounded-full">
                                            {formatearMoneda(transaccion.value)}
                                        </p>
                                        <button
                                            onClick={() => handleEdit(transaccion)}
                                            className="text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Editar"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => handleDelete(transaccion.id)}
                                            className="text-red-600 hover:text-red-800 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Eliminar"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {ingresos.length === 0 && (
                                <p className="px-6 py-12 text-center text-gray-400">No hay ingresos este mes</p>
                            )}
                        </div>
                    </div>

                    {/* Gastos */}
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                        <div className="px-6 py-5 bg-gradient-to-r from-[#EF4444] to-[#DC2626]">
                            <h3 className="text-lg font-bold text-white flex items-center">
                                <span className="mr-2">💸</span>
                                Gastos
                            </h3>
                        </div>
                        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                            {gastos.map((transaccion) => (
                                <div key={transaccion.id} className="px-6 py-4 flex justify-between items-center hover:bg-red-50 transition-colors duration-200 group">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900">{transaccion.conceptName}</p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(transaccion.date).toLocaleDateString('es-CO')}
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <p className="text-sm font-bold text-[#EF4444] bg-red-100 px-3 py-1 rounded-full">
                                            {formatearMoneda(transaccion.value)}
                                        </p>
                                        <button
                                            onClick={() => handleEdit(transaccion)}
                                            className="text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Editar"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => handleDelete(transaccion.id)}
                                            className="text-red-600 hover:text-red-800 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Eliminar"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {gastos.length === 0 && (
                                <p className="px-6 py-12 text-center text-gray-400">No hay gastos este mes</p>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}