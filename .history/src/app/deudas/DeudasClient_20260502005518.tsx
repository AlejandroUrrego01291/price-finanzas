'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type DebtPayment = {
    id: string
    date: string
    paidAmount: number
    interestPaid: number
    capitalPaid: number
    extraPayment: number | null
    remainingBalance: number
}

type Debt = {
    id: string
    concept: string
    initialAmount: number
    monthlyPayment: number
    interestRate: number
    startDate: string
    isActive: boolean
    payments: DebtPayment[]
}

type Props = {
    deudas: Debt[]
    totalDeudas: number
}

export default function DeudasClient({ deudas: deudasIniciales, totalDeudas: totalInicial }: Props) {
    const router = useRouter()
    const [deudas, setDeudas] = useState<Debt[]>(deudasIniciales)
    const [totalDeudas, setTotalDeudas] = useState(totalInicial)
    const [showForm, setShowForm] = useState(false)
    const [editandoDeuda, setEditandoDeuda] = useState<Debt | null>(null)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null)
    const [paymentAmount, setPaymentAmount] = useState('')
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
    const [formData, setFormData] = useState({
        concept: '',
        initialAmount: '',
        monthlyPayment: '',
        interestRate: '',
        startDate: new Date().toISOString().split('T')[0]
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            const url = editandoDeuda ? `/api/deudas?id=${editandoDeuda.id}` : '/api/deudas'
            const method = editandoDeuda ? 'PUT' : 'POST'

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    concept: formData.concept,
                    initialAmount: Number(formData.initialAmount),
                    monthlyPayment: Number(formData.monthlyPayment),
                    interestRate: Number(formData.interestRate),
                    startDate: formData.startDate
                })
            })

            if (response.ok) {
                window.location.reload()
            }
        } catch (error) {
            console.error('Error:', error)
        }
    }

    const handleEditDebt = (deuda: Debt) => {
        setEditandoDeuda(deuda)
        setFormData({
            concept: deuda.concept,
            initialAmount: deuda.initialAmount.toString(),
            monthlyPayment: deuda.monthlyPayment.toString(),
            interestRate: deuda.interestRate.toString(),
            startDate: deuda.startDate
        })
        setShowForm(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleDeleteDebt = async (id: string) => {
        if (!confirm('¿Eliminar esta deuda y todo su historial de pagos?')) return
        try {
            const response = await fetch(`/api/deudas?id=${id}`, { method: 'DELETE' })
            if (response.ok) {
                window.location.reload()
            }
        } catch (error) {
            console.error('Error:', error)
        }
    }

    const openPaymentModal = (debtId: string) => {
        const deuda = deudas.find(d => d.id === debtId)
        if (!deuda) return

        setSelectedDebtId(debtId)
        setPaymentAmount(deuda.monthlyPayment.toString())
        setPaymentDate(new Date().toISOString().split('T')[0])
        setShowPaymentModal(true)
    }

    const handleCustomPayment = async () => {
        if (!selectedDebtId) return

        const amount = Number(paymentAmount)
        if (amount <= 0) {
            alert('Ingresa un monto válido')
            return
        }

        try {
            const deuda = deudas.find(d => d.id === selectedDebtId)
            const pagoMensualEstablecido = deuda?.monthlyPayment || 0
            const extraPayment = Math.max(0, amount - pagoMensualEstablecido)

            const response = await fetch('/api/deudas/pagos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    debtId: selectedDebtId,
                    date: paymentDate,
                    extraPayment: extraPayment
                })
            })

            if (response.ok) {
                setShowPaymentModal(false)
                window.location.reload()
            } else {
                alert('Error al registrar el pago')
            }
        } catch (error) {
            console.error('Error:', error)
            alert('Error de conexión')
        }
    }

    const handleDeletePayment = async (debtId: string, paymentId: string) => {
        if (!confirm('¿Eliminar este pago? Se recalculará el saldo automáticamente.')) return
        try {
            const response = await fetch(`/api/deudas/pagos?debtId=${debtId}&paymentId=${paymentId}`, { method: 'DELETE' })
            if (response.ok) {
                window.location.reload()
            }
        } catch (error) {
            console.error('Error:', error)
        }
    }

    const handleCancelEdit = () => {
        setEditandoDeuda(null)
        setFormData({
            concept: '',
            initialAmount: '',
            monthlyPayment: '',
            interestRate: '',
            startDate: new Date().toISOString().split('T')[0]
        })
        setShowForm(false)
    }

    const obtenerSaldoActual = (deuda: Debt) => {
        return deuda.payments[0]?.remainingBalance ?? deuda.initialAmount
    }

    const obtenerPagado = (deuda: Debt) => {
        return deuda.initialAmount - obtenerSaldoActual(deuda)
    }

    const obtenerPorcentajePagado = (deuda: Debt) => {
        if (deuda.initialAmount === 0) return 0
        return (obtenerPagado(deuda) / deuda.initialAmount) * 100
    }

    const calcularTiempoRestante = (deuda: Debt) => {
        const saldoActual = obtenerSaldoActual(deuda)
        if (saldoActual <= 0) return { meses: 0, fecha: 'Pagada' }

        let saldo = saldoActual
        let meses = 0
        const fechaProyeccion = new Date()

        while (saldo > 0 && meses < 120) {
            const interes = (saldo * deuda.interestRate) / 100
            const abono = Math.min(deuda.monthlyPayment, saldo + interes)
            saldo = saldo + interes - abono
            meses++
            fechaProyeccion.setMonth(fechaProyeccion.getMonth() + 1)
        }

        return { meses, fecha: fechaProyeccion.toLocaleDateString('es-CO') }
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
                {/* Botón Nueva Deuda */}
                <div className="mb-6 flex justify-end">
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        {showForm ? 'Cancelar' : '+ Nueva Deuda'}
                    </button>
                </div>

                {/* Formulario nueva/editar deuda */}
                {showForm && (
                    <div className="bg-white shadow rounded-lg p-6 mb-6">
                        <h3 className="text-lg font-medium mb-4">
                            {editandoDeuda ? 'Editar Deuda' : 'Registrar Nueva Deuda'}
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
                                        placeholder="Ej: Banco, Préstamo personal..."
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Saldo Inicial</label>
                                    <input
                                        type="number"
                                        value={formData.initialAmount}
                                        onChange={(e) => setFormData({ ...formData, initialAmount: e.target.value })}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                        placeholder="0"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Pago Mensual</label>
                                    <input
                                        type="number"
                                        value={formData.monthlyPayment}
                                        onChange={(e) => setFormData({ ...formData, monthlyPayment: e.target.value })}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                        placeholder="0"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Tasa de Interés (%)</label>
                                    <input
                                        type="number"
                                        value={formData.interestRate}
                                        onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                        placeholder="0"
                                        step="0.1"
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
                                {editandoDeuda && (
                                    <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                                    >
                                        Cancelar
                                    </button>
                                )}
                                <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                                    {editandoDeuda ? 'Actualizar' : 'Guardar Deuda'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Total deudas */}
                <div className="bg-white shadow rounded-lg p-6 mb-6">
                    <p className="text-sm text-gray-600">Tus deudas suman:</p>
                    <p className="text-3xl font-bold text-red-600">{formatearMoneda(totalDeudas)}</p>
                </div>

                {/* Listado de deudas */}
                <div className="space-y-6">
                    {deudas.map((deuda) => {
                        const saldoActual = obtenerSaldoActual(deuda)
                        const pagado = obtenerPagado(deuda)
                        const porcentajePagado = obtenerPorcentajePagado(deuda)
                        const tiempoRestante = calcularTiempoRestante(deuda)

                        return (
                            <div key={deuda.id} className="bg-white shadow rounded-lg overflow-hidden">
                                {/* Cabecera de la deuda */}
                                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3">
                                                <h3 className="text-lg font-medium text-gray-900">{deuda.concept}</h3>
                                                <button
                                                    onClick={() => handleEditDebt(deuda)}
                                                    className="text-blue-600 hover:text-blue-800 text-sm"
                                                    title="Editar deuda"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteDebt(deuda.id)}
                                                    className="text-red-600 hover:text-red-800 text-sm"
                                                    title="Eliminar deuda"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                Inicio: {formatearFecha(deuda.startDate)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-600">Progreso</p>
                                            <p className="text-xl font-bold text-green-600">{porcentajePagado.toFixed(1)}%</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Barra de progreso */}
                                <div className="px-6 py-4">
                                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                                        <span>Pagado: {formatearMoneda(pagado)}</span>
                                        <span>Pendiente: {formatearMoneda(saldoActual)}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                        <div
                                            className="bg-green-600 h-3 rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min(porcentajePagado, 100)}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Detalles de la deuda */}
                                <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-4 gap-4 bg-white">
                                    <div>
                                        <p className="text-xs text-gray-500">Saldo inicial</p>
                                        <p className="text-sm font-medium">{formatearMoneda(deuda.initialAmount)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Pago mensual</p>
                                        <p className="text-sm font-medium">{formatearMoneda(deuda.monthlyPayment)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Interés</p>
                                        <p className="text-sm font-medium">{deuda.interestRate}% mensual</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Tiempo restante</p>
                                        <p className="text-sm font-medium">
                                            {tiempoRestante.meses > 0
                                                ? `${tiempoRestante.meses} meses (${tiempoRestante.fecha})`
                                                : tiempoRestante.fecha}
                                        </p>
                                    </div>
                                </div>

                                {/* Tabla de pagos */}
                                {deuda.payments.length > 0 && (
                                    <div className="border-t border-gray-200">
                                        <div className="px-6 py-3 bg-gray-50">
                                            <h4 className="text-sm font-medium text-gray-700">Historial de Pagos</h4>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <div className="max-h-60 overflow-y-auto">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-50 sticky top-0">
                                                        <tr>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Interés</th>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Abono Capital</th>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pago Extra</th>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pago Total</th>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Saldo Final</th>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {deuda.payments.map((pago) => (
                                                            <tr key={pago.id} className="hover:bg-gray-50">
                                                                <td className="px-6 py-2 text-sm">{formatearFecha(pago.date)}</td>
                                                                <td className="px-6 py-2 text-sm">{formatearMoneda(pago.interestPaid)}</td>
                                                                <td className="px-6 py-2 text-sm">{formatearMoneda(pago.capitalPaid)}</td>
                                                                <td className="px-6 py-2 text-sm">{pago.extraPayment ? formatearMoneda(pago.extraPayment) : '-'}</td>
                                                                <td className="px-6 py-2 text-sm font-medium">{formatearMoneda(pago.paidAmount)}</td>
                                                                <td className="px-6 py-2 text-sm">{formatearMoneda(pago.remainingBalance)}</td>
                                                                <td className="px-6 py-2 text-sm">
                                                                    <button
                                                                        onClick={() => handleDeletePayment(deuda.id, pago.id)}
                                                                        className="text-red-600 hover:text-red-800"
                                                                        title="Eliminar pago"
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
                                    </div>
                                )}

                                {/* Botón para registrar pago */}
                                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                                    <button
                                        onClick={() => openPaymentModal(deuda.id)}
                                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                    >
                                        💰 Registrar Pago
                                    </button>
                                </div>
                            </div>
                        )
                    })}

                    {deudas.length === 0 && (
                        <div className="bg-white shadow rounded-lg p-12 text-center">
                            <p className="text-gray-500">No tienes deudas registradas</p>
                            <button
                                onClick={() => setShowForm(true)}
                                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Registrar primera deuda
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* Modal para registrar pago personalizado */}
            {showPaymentModal && selectedDebtId && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Registrar Pago</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Monto a pagar <span className="text-gray-400">(ej: 150,000)</span>
                                </label>
                                <input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Ingresa el monto"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha del pago</label>
                                <input
                                    type="date"
                                    value={paymentDate}
                                    onChange={(e) => setPaymentDate(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
                                💡 Si pagas más que tu cuota mensual ({formatearMoneda(deudas.find(d => d.id === selectedDebtId)?.monthlyPayment || 0)}),
                                el excedente se aplicará como <strong>pago extra</strong> y reducirá tu saldo más rápido.
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    onClick={() => setShowPaymentModal(false)}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleCustomPayment}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                                >
                                    Registrar Pago
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}