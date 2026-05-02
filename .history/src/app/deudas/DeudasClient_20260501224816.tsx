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
            const response = await fetch('/api/deudas', {
                method: 'POST',
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
                const nuevaDeuda = await response.json()
                const deudaConvertida = {
                    id: nuevaDeuda.id,
                    concept: nuevaDeuda.concept,
                    initialAmount: nuevaDeuda.initialAmount,
                    monthlyPayment: nuevaDeuda.monthlyPayment,
                    interestRate: nuevaDeuda.interestRate,
                    startDate: new Date(nuevaDeuda.startDate).toISOString().split('T')[0],
                    isActive: nuevaDeuda.isActive,
                    payments: []
                }
                setDeudas([deudaConvertida, ...deudas])
                setTotalDeudas(totalDeudas + Number(formData.initialAmount))
                setFormData({
                    concept: '',
                    initialAmount: '',
                    monthlyPayment: '',
                    interestRate: '',
                    startDate: new Date().toISOString().split('T')[0]
                })
                setShowForm(false)
                router.refresh()
            }
        } catch (error) {
            console.error('Error:', error)
        }
    }

    const handleRegisterPayment = async (debtId: string, paymentData: any) => {
        try {
            const response = await fetch('/api/deudas/pagos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    debtId,
                    ...paymentData
                })
            })

            if (response.ok) {
                const deudaActualizada = await response.json()

                // Convertir fechas de los pagos
                const pagosConvertidos = deudaActualizada.payments.map((p: any) => ({
                    ...p,
                    date: new Date(p.date).toISOString().split('T')[0]
                }))

                const deudaConvertida = {
                    ...deudaActualizada,
                    startDate: new Date(deudaActualizada.startDate).toISOString().split('T')[0],
                    payments: pagosConvertidos
                }

                // Obtener el nuevo saldo actual de la deuda actualizada
                const nuevoSaldo = deudaConvertida.payments[0]?.remainingBalance ?? deudaConvertida.initialAmount

                // Actualizar el estado de deudas
                setDeudas(prev => prev.map(d => d.id === debtId ? deudaConvertida : d))

                // Recalcular el total de deudas sumando todas las deudas
                setTotalDeudas(prevTotal => {
                    // Calcular sumando todas las deudas actualizadas
                    const nuevasDeudas = deudas.map(d =>
                        d.id === debtId ? deudaConvertida : d
                    )
                    const nuevoTotal = nuevasDeudas.reduce((sum, d) => {
                        const saldo = d.payments[0]?.remainingBalance ?? d.initialAmount
                        return sum + saldo
                    }, 0)
                    return nuevoTotal
                })

                router.refresh()
            }
        } catch (error) {
            console.error('Error:', error)
        }
    }

    const obtenerSaldoActual = (deuda: Debt) => {
        return deuda.payments[0]?.remainingBalance ?? deuda.initialAmount
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
                <div className="mb-6 flex justify-end">
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        {showForm ? 'Cancelar' : '+ Nueva Deuda'}
                    </button>
                </div>

                {showForm && (
                    <div className="bg-white shadow rounded-lg p-6 mb-6">
                        <h3 className="text-lg font-medium mb-4">Registrar Nueva Deuda</h3>
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
                            <div className="flex justify-end">
                                <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                                    Guardar Deuda
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="bg-white shadow rounded-lg p-6 mb-6">
                    <p className="text-sm text-gray-600">Tus deudas suman:</p>
                    <p className="text-3xl font-bold text-red-600">{formatearMoneda(totalDeudas)}</p>
                </div>

                <div className="space-y-6">
                    {deudas.map((deuda) => {
                        const saldoActual = obtenerSaldoActual(deuda)
                        const tiempoRestante = calcularTiempoRestante(deuda)

                        return (
                            <div key={deuda.id} className="bg-white shadow rounded-lg overflow-hidden">
                                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900">{deuda.concept}</h3>
                                            <p className="text-sm text-gray-600">
                                                Inicio: {formatearFecha(deuda.startDate)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-600">Saldo actual</p>
                                            <p className="text-xl font-bold text-red-600">{formatearMoneda(saldoActual)}</p>
                                        </div>
                                    </div>
                                </div>

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

                                {deuda.payments.length > 0 && (
                                    <div className="border-t border-gray-200">
                                        <div className="px-6 py-3 bg-gray-50">
                                            <h4 className="text-sm font-medium text-gray-700">Historial de Pagos</h4>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Interés</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Abono Capital</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pago Extra</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pago Total</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Saldo Final</th>
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
                                            const pagoExtra = prompt('¿Deseas hacer un pago extra? (Deja en blanco si no)', '0')
                                            const fecha = prompt('Fecha del pago (YYYY-MM-DD)', new Date().toISOString().split('T')[0])
                                            if (fecha) {
                                                handleRegisterPayment(deuda.id, {
                                                    date: fecha,
                                                    extraPayment: pagoExtra ? Number(pagoExtra) : 0
                                                })
                                            }
                                        }}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                    >
                                        Registrar Pago Mensual
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
        </div>
    )
}