'use client'

import { useState } from 'react'
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

type Props = {
    conceptos: Concepto[]
}

export default function ConceptosClient({ conceptos: initialConceptos }: Props) {
    const router = useRouter()
    const [conceptos, setConceptos] = useState<Concepto[]>(initialConceptos)
    const [editandoId, setEditandoId] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        type: 'GASTO',
        name: '',
        category: '',
        subType: 'FIJO',
        value: '',
        fixedDate: ''
    })
    const [mostrarIngresos, setMostrarIngresos] = useState(true)
    const [nuevaCategoria, setNuevaCategoria] = useState('')
    const [mostrarInputNuevaCategoria, setMostrarInputNuevaCategoria] = useState(false)

    const tipos = ['INGRESO', 'GASTO']
    const subtipos = ['FIJO', 'VARIABLE', 'CASUAL']

    const categoriasIngreso = ['Empleo', 'Comisiones', 'Independiente']
    const categoriasGasto = [
        'Hogar', 'Telecomunicaciones', 'Educación', 'Alimentación',
        'Deudas', 'Ahorro', 'Servicios Públicos', 'No planeados',
        'Transporte', 'Salud', 'Obligaciones', 'Metas'
    ]

    const categoriasDisponibles = formData.type === 'INGRESO' ? categoriasIngreso : categoriasGasto
    const ingresos = conceptos.filter(c => c.type === 'INGRESO')
    const gastos = conceptos.filter(c => c.type === 'GASTO')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Determinar la categoría final
        const categoriaFinal = mostrarInputNuevaCategoria && nuevaCategoria
            ? nuevaCategoria
            : formData.category

        try {
            const response = await fetch('/api/conceptos', {
                method: editandoId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editandoId,
                    type: formData.type,
                    name: formData.name,
                    category: categoriaFinal || null,
                    subType: formData.subType,  // ← El subtipo se envía correctamente
                    value: formData.value ? Number(formData.value) : null,
                    fixedDate: formData.fixedDate ? Number(formData.fixedDate) : null
                })
            })

            if (response.ok) {
                setFormData({
                    type: 'GASTO',
                    name: '',
                    category: '',
                    subType: 'FIJO',
                    value: '',
                    fixedDate: ''
                })
                setNuevaCategoria('')
                setMostrarInputNuevaCategoria(false)
                setEditandoId(null)

                const res = await fetch('/api/conceptos')
                const data = await res.json()
                setConceptos(data)
                router.refresh()
            }
        } catch (error) {
            console.error('Error:', error)
        }
    }

    const handleEdit = (concepto: Concepto) => {
        setEditandoId(concepto.id)
        setFormData({
            type: concepto.type,
            name: concepto.name,
            category: concepto.category || '',
            subType: concepto.subType || 'FIJO',
            value: concepto.value?.toString() || '',
            fixedDate: concepto.fixedDate?.toString() || ''
        })
        setNuevaCategoria('')
        setMostrarInputNuevaCategoria(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este concepto?')) return
        try {
            const response = await fetch(`/api/conceptos?id=${id}`, { method: 'DELETE' })
            if (response.ok) {
                setConceptos(conceptos.filter(c => c.id !== id))
                router.refresh()
            }
        } catch (error) {
            console.error('Error:', error)
        }
    }

    const formatearMoneda = (valor: number | null) => {
        if (valor === null) return '-'
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(valor)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">

            <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                {/* Formulario */}
                <div className="bg-white shadow rounded-lg p-4 md:p-6 mb-6">
                    <h2 className="text-subtitle text-lg mb-4">
                        {editandoId ? 'Editar Concepto' : 'Nuevo Concepto'}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-body text-sm font-medium mb-1">Tipo</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => {
                                        setFormData({ ...formData, type: e.target.value, category: '' })
                                        setNuevaCategoria('')
                                        setMostrarInputNuevaCategoria(false)
                                    }}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                    required
                                >
                                    {tipos.map(tipo => (
                                        <option key={tipo} value={tipo}>{tipo}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-body text-sm font-medium mb-1">Nombre</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                    placeholder="Ej: Salario, Arriendo..."
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-body text-sm font-medium mb-1">Categoría</label>
                                {!mostrarInputNuevaCategoria ? (
                                    <div className="flex flex-col sm:flex-row sm:space-x-2 gap-2">
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                                        >
                                            <option value="">Selecciona una categoría</option>
                                            {categoriasDisponibles.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => setMostrarInputNuevaCategoria(true)}
                                            className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm whitespace-nowrap"
                                        >
                                            + Nueva
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col sm:flex-row sm:space-x-2 gap-2">
                                        <input
                                            type="text"
                                            value={nuevaCategoria}
                                            onChange={(e) => setNuevaCategoria(e.target.value)}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                                            placeholder="Nueva categoría"
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setMostrarInputNuevaCategoria(false)
                                                setNuevaCategoria('')
                                            }}
                                            className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                )}
                                <p className="text-xs text-gray-500 mt-1">
                                    {formData.type === 'INGRESO'
                                        ? 'Categorías para ingresos: Empleo, Comisiones, Independiente'
                                        : 'Selecciona una categoría de gasto o crea una nueva'}
                                </p>
                            </div>

                            <div>
                                <label className="block text-body text-sm font-medium mb-1">Frecuencia</label>
                                <select
                                    value={formData.subType}
                                    onChange={(e) => setFormData({ ...formData, subType: e.target.value })}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                >
                                    {subtipos.map(sub => (
                                        <option key={sub} value={sub}>{sub}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-body text-sm font-medium mb-1">
                                    Valor Predeterminado <span className="text-gray-500">(opcional)</span>
                                </label>
                                <input
                                    type="number"
                                    value={formData.value}
                                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                    placeholder="0"
                                    min="0"
                                />
                            </div>

                            <div>
                                <label className="block text-body text-sm font-medium mb-1">
                                    Día Fijo <span className="text-gray-500">(opcional, 1-31)</span>
                                </label>
                                <input
                                    type="number"
                                    value={formData.fixedDate}
                                    onChange={(e) => setFormData({ ...formData, fixedDate: e.target.value })}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                    placeholder="Ej: 15"
                                    min="1"
                                    max="31"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-2">
                            {editandoId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditandoId(null)
                                        setFormData({ type: 'GASTO', name: '', category: '', subType: 'FIJO', value: '', fixedDate: '' })
                                        setNuevaCategoria('')
                                        setMostrarInputNuevaCategoria(false)
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-body hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                            )}
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                {editandoId ? 'Actualizar' : 'Guardar'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Selector de vista */}
                <div className="flex space-x-2 mb-4">
                    <button
                        onClick={() => setMostrarIngresos(true)}
                        className={`px-4 py-2 rounded-md text-sm md:text-base ${mostrarIngresos
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        Ingresos
                    </button>
                    <button
                        onClick={() => setMostrarIngresos(false)}
                        className={`px-4 py-2 rounded-md text-sm md:text-base ${!mostrarIngresos
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        Gastos
                    </button>
                </div>

                {/* Tabla responsiva con scroll horizontal */}
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-[800px] md:min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Concepto</th>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Categoría</th>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Frecuencia</th>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Valor Fijo</th>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Día Fijo</th>
                                    <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {(mostrarIngresos ? ingresos : gastos).map((concepto) => (
                                    <tr key={concepto.id} className="hover:bg-gray-50">
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {concepto.name}
                                        </td>
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {concepto.category || '-'}
                                        </td>
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {concepto.subType || '-'}
                                        </td>
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {concepto.value ? formatearMoneda(concepto.value) : '-'}
                                        </td>
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {concepto.fixedDate || '-'}
                                        </td>
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleEdit(concepto)}
                                                className="text-blue-600 hover:text-blue-900 mr-3"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => handleDelete(concepto.id)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {(mostrarIngresos ? ingresos : gastos).length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-4 md:px-6 py-8 text-center text-gray-500">
                                            No hay {mostrarIngresos ? 'ingresos' : 'gastos'} creados
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