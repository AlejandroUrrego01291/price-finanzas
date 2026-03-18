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
        subType: 'FIJO'
    })

    const tipos = ['INGRESO', 'GASTO']
    const subtipos = ['FIJO', 'VARIABLE', 'CASUAL']
    const categoriasPorDefecto = [
        'Empleo', 'Hogar', 'Telecomunicaciones', 'Educación',
        'Alimentación', 'Deudas', 'Ahorro', 'Servicios Públicos',
        'Independiente', 'No planeados', 'Transporte', 'Salud'
    ]

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            const response = await fetch('/api/conceptos', {
                method: editandoId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editandoId,
                    ...formData
                })
            })

            if (response.ok) {
                setFormData({ type: 'GASTO', name: '', category: '', subType: 'FIJO' })
                setEditandoId(null)
                router.refresh()

                // Recargar conceptos
                const res = await fetch('/api/conceptos')
                const data = await res.json()
                setConceptos(data)
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
            subType: concepto.subType || 'FIJO'
        })
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este concepto?')) return

        try {
            const response = await fetch(`/api/conceptos?id=${id}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                router.refresh()
                setConceptos(conceptos.filter(c => c.id !== id))
            }
        } catch (error) {
            console.error('Error:', error)
        }
    }

    const handleCancel = () => {
        setEditandoId(null)
        setFormData({ type: 'GASTO', name: '', category: '', subType: 'FIJO' })
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-xl font-semibold text-gray-900">Price - Conceptos</h1>
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
                {/* Formulario para crear/editar conceptos */}
                <div className="bg-white shadow rounded-lg p-6 mb-6">
                    <h2 className="text-lg font-medium mb-4">
                        {editandoId ? 'Editar Concepto' : 'Nuevo Concepto'}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Tipo</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                    required
                                >
                                    {tipos.map(tipo => (
                                        <option key={tipo} value={tipo}>{tipo}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nombre del Concepto</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                    placeholder="Ej: Salario, Arriendo, Mercado..."
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Categoría</label>
                                <input
                                    type="text"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                    placeholder="Ej: Empleo, Hogar, Educación..."
                                    list="categorias"
                                />
                                <datalist id="categorias">
                                    {categoriasPorDefecto.map(cat => (
                                        <option key={cat} value={cat} />
                                    ))}
                                </datalist>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Subtipo</label>
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
                        </div>

                        <div className="flex justify-end space-x-2">
                            {editandoId && (
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                            )}
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                            >
                                {editandoId ? 'Actualizar' : 'Guardar'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Tabla de conceptos */}
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Concepto</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subtipo</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {conceptos.map((concepto) => (
                                <tr key={concepto.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${concepto.type === 'INGRESO'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                            }`}>
                                            {concepto.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {concepto.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {concepto.category || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {concepto.subType || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
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
                            {conceptos.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        No hay conceptos creados. ¡Comienza agregando uno!
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    )
}