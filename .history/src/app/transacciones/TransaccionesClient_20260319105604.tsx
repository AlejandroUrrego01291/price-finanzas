'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

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
    totalGastos: totalGastosInicial,
}: Props) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [tipo, setTipo] = useState<'INGRESO' | 'GASTO'>('INGRESO')
    const [conceptoId, setConceptoId] = useState('')
    const [valor, setValor] = useState('')
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
    const [mostrarFormNuevoConcepto, setMostrarFormNuevoConcepto] = useState(false)
    const [nuevoConcepto, setNuevoConcepto] = useState('')

    const [editandoId, setEditandoId] = useState<string | null>(null)

    // Detectar parámetro ?edit=xxx y cargar datos para edición
    useEffect(() => {
        const editId = searchParams.get('edit')
        if (!editId) {
            setEditandoId(null)
            return
        }

        const tx = transaccionesIniciales.find(t => t.id === editId)
        if (!tx) {
            console.warn('Transacción no encontrada:', editId)
            router.replace('/transacciones', { scroll: false })
            return
        }

        setEditandoId(tx.id)
        setTipo(tx.type as 'INGRESO' | 'GASTO')
        setValor(tx.value.toString())
        setFecha(tx.date.split('T')[0])

        // Buscar concepto (primero por id, luego por nombre como fallback)
        let concepto = tx.concept ? conceptos.find(c => c.id === tx.concept?.id) : null
        if (!concepto) {
            concepto = conceptos.find(c => c.name === tx.conceptName && c.type === tx.type)
        }

        setConceptoId(concepto?.id || '')
        setMostrarFormNuevoConcepto(false)

        // Limpiar ?edit de la URL sin recargar página
        router.replace('/transacciones', { scroll: false })
    }, [searchParams, transaccionesIniciales, conceptos, router])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        let finalConceptId = conceptoId
        let finalConceptName = ''
        let finalCategory = ''
        let finalSubType = ''

        // 1. ¿Es nuevo concepto?
        if (mostrarFormNuevoConcepto && nuevoConcepto.trim()) {
            try {
                const res = await fetch('/api/conceptos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: tipo,
                        name: nuevoConcepto.trim(),
                        category: 'No planeados',
                        subType: 'CASUAL',
                        value: valor ? Number(valor) : null,
                        fixedDate: null,
                    }),
                })

                if (!res.ok) throw new Error('Error al crear concepto')

                const nuevo = await res.json()
                finalConceptId = nuevo.id
                finalConceptName = nuevo.name
                finalCategory = 'No planeados'
                finalSubType = 'CASUAL'
            } catch (err) {
                console.error(err)
                alert('No se pudo crear el nuevo concepto')
                return
            }
        } else {
            const c = conceptos.find(c => c.id === conceptoId)
            if (!c) {
                alert('Selecciona un concepto válido')
                return
            }
            finalConceptName = c.name
            finalCategory = c.category || 'No planeados'
            finalSubType = c.subType || 'CASUAL'
        }

        try {
            const url = editandoId ? `/api/transacciones?id=${editandoId}` : '/api/transacciones'
            const method = editandoId ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: tipo,
                    conceptId: finalConceptId,
                    conceptName: finalConceptName,
                    value: Number(valor),
                    date: fecha,
                    category: finalCategory,
                    subType: finalSubType,
                }),
            })

            if (!res.ok) {
                alert('Error al guardar la transacción')
                return
            }

            // Limpiar formulario
            setConceptoId('')
            setValor('')
            setFecha(new Date().toISOString().split('T')[0])
            setNuevoConcepto('')
            setMostrarFormNuevoConcepto(false)
            setEditandoId(null)

            // Refrescar datos del servidor (la forma más segura y recomendada)
            router.refresh()
        } catch (err) {
            console.error(err)
            alert('Error al guardar transacción')
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

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta transacción?')) return

        try {
            const res = await fetch(`/api/transacciones?id=${id}`, { method: 'DELETE' })
            if (res.ok) {
                router.refresh()
                if (editandoId === id) handleCancelEdit()
            } else {
                alert('No se pudo eliminar')
            }
        } catch (err) {
            console.error(err)
            alert('Error al eliminar')
        }
    }

    const formatearMoneda = (v: number) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v)

    // ──────────────────────────────────────────────────────────────
    // RENDER (mantengo tu estructura, solo ajusto partes clave)
    // ──────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Navbar similar ... */}

            <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                <div className="bg-white shadow rounded-lg p-6 mb-6">
                    <h2 className="text-xl font-bold mb-4">
                        {editandoId ? 'Editar Transacción' : 'Nueva Transacción'}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Tipo */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Tipo</label>
                            <div className="flex rounded-md shadow-sm">
                                <button
                                    type="button"
                                    onClick={() => setTipo('INGRESO')}
                                    className={`flex-1 px-4 py-2 rounded-l-md border ${tipo === 'INGRESO' ? 'bg-green-600 text-white' : 'bg-white text-gray-700'}`}
                                >
                                    Ingreso
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTipo('GASTO')}
                                    className={`flex-1 px-4 py-2 rounded-r-md border ${tipo === 'GASTO' ? 'bg-red-600 text-white' : 'bg-white text-gray-700'}`}
                                >
                                    Gasto
                                </button>
                            </div>
                        </div>

                        {/* Concepto */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Concepto</label>
                            {!mostrarFormNuevoConcepto ? (
                                <select
                                    value={conceptoId}
                                    onChange={e => setConceptoId(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md"
                                    required
                                >
                                    <option value="">Selecciona un concepto</option>
                                    {conceptos.filter(c => c.type === tipo).map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} {c.value ? `(${formatearMoneda(c.value)})` : ''}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    value={nuevoConcepto}
                                    onChange={e => setNuevoConcepto(e.target.value)}
                                    placeholder="Nombre del nuevo concepto"
                                    className="w-full px-3 py-2 border rounded-md"
                                    required
                                />
                            )}
                        </div>

                        {/* Botón nuevo concepto */}
                        <button
                            type="button"
                            onClick={() => {
                                setMostrarFormNuevoConcepto(!mostrarFormNuevoConcepto)
                                setConceptoId('')
                                setNuevoConcepto('')
                            }}
                            className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
                        >
                            {mostrarFormNuevoConcepto ? 'Usar concepto existente' : '+ Nuevo concepto'}
                        </button>

                        {/* Valor y Fecha */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Valor</label>
                            <input
                                type="number"
                                value={valor}
                                onChange={e => setValor(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Fecha</label>
                            <input
                                type="date"
                                value={fecha}
                                onChange={e => setFecha(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md"
                                required
                            />
                        </div>

                        <div className="flex space-x-3">
                            {editandoId && (
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                                >
                                    Cancelar
                                </button>
                            )}
                            <button
                                type="submit"
                                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                {editandoId ? 'Actualizar' : 'Guardar'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Aquí puedes mantener la lista de transacciones e ingresos/gastos ... */}
                {/* Usa transaccionesIniciales directamente y confía en router.refresh() */}
            </main>
        </div>
    )
}