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

    const tipos = ['INGRESO', 'GASTO']
    const subtipos = ['FIJO', 'VARIABLE', 'CASUAL']
    const categoriasPorDefecto = [
        'Empleo', 'Hogar', 'Telecomunicaciones', 'Educación',
        'Alimentación', 'Deudas', 'Ahorro', 'Servicios Públicos',
        'Independiente', 'No planeados', 'Transporte', 'Salud',
        'Obligaciones', 'Metas' // Nuevas categorías
    ]

    // Separar conceptos por tipo
    const ingresos = conceptos.filter(c => c.type === 'INGRESO')
    const gastos = conceptos.filter(c => c.type === 'GASTO')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            const response = await fetch('/api/conceptos', {
                method: editandoId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editandoId,
                    type: formData.type,
                    name: formData.name,
                    category: formData.category || null,
                    subType: formData.subType,
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
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este concepto?')) return

        try {
            const response = await fetch(`/api/conceptos?id=${id}`, {
                method: 'DELETE'
            })

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
            {/* Navbar moderno con efecto glassmorphism - MISMO ESTILO QUE EL DASHBOARD */}
            <nav className="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-50 border-b border-gray-200">
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
            </nav>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {/* Formulario para crear/editar conceptos */}
                <div className="bg-white shadow rounded-lg p-6 mb-6">
                    <h2 className="text-subtitle text-lg mb-4">
                        {editandoId ? 'Editar Concepto' : 'Nuevo Concepto'}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-body text-sm font-medium mb-1">Tipo</label>
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
                                <input
                                    type="text"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                    placeholder="Ej: Empleo, Hogar..."
                                    list="categorias"
                                />
                                <datalist id="categorias">
                                    {categoriasPorDefecto.map(cat => (
                                        <option key={cat} value={cat} />
                                    ))}
                                </datalist>
                            </div>

                            <div>
                                <label className="block text-body text-sm font-medium mb-1">Subtipo</label>
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
                        className={`px-4 py-2 rounded-md ${mostrarIngresos
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        Ingresos
                    </button>
                    <button
                        onClick={() => setMostrarIngresos(false)}
                        className={`px-4 py-2 rounded-md ${!mostrarIngresos
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        Gastos
                    </button>
                </div>

                {/* Tabla de conceptos */}
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Concepto</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Categoría</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Subtipo</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Valor Fijo</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Día Fijo</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {(mostrarIngresos ? ingresos : gastos).map((concepto) => (
                                <tr key={concepto.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {concepto.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {concepto.category || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {concepto.subType || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {concepto.value ? formatearMoneda(concepto.value) : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {concepto.fixedDate || '-'}
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
                            {(mostrarIngresos ? ingresos : gastos).length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                        No hay {mostrarIngresos ? 'ingresos' : 'gastos'} creados
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