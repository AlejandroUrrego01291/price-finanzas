'use client'

import { useState, useMemo } from 'react'
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
                setDeudas([nuevaDeuda, ...deudas])
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
                setDeudas(deudas.map(d => d.id === debtId ? deudaActualizada : d))
                router.refresh()
            }
        } catch (error) {
            console.error('Error:', error)
        }
    }

    const calcularTiempoRestante = (deuda: Debt) => {
        const ultimoPago = deuda.payments[0]
        const saldoActual = ultimoPago?.remainingBalance ?? deuda.initialAmount

        if (saldoActual <= 0) return { meses: 0, fecha: 'Pagada' }

        // Calcular cuántos meses tomando en cuenta intereses
        let saldo = saldoActual
        let meses = 0
        const fechaActual = new Date()
        const fechaProyeccion = new Date(fechaActual)

        while (saldo > 0 && meses < 120) { // Límite de 10 años
            const interes = (saldo * deuda.interestRate) / 100
            const abono = Math.min(deuda.monthlyPayment, saldo + interes)
            saldo = saldo + interes - abono
            meses++
            fechaProyeccion.setMonth(fechaProyeccion.getMonth() + 1)
        }

        return {
            meses,
            fecha: fechaProyeccion.toLocaleDateString('es-CO')
        }
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
            {/* Navbar moderno con efecto glassmorphism - MISMO ESTILO QUE EL DASHBOARD */}
            <nav className="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-50 border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        {/* Logo con gradiente */}
                        <div className="flex items-center">
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                Price
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
                {/* Botón para nueva deuda */}
                <div className="mb-6 flex justify-between items-center">
                    <h2 className="text-subtitle text-2xl">Mis Deudas</h2>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        {showForm ? 'Cancelar' : '+ Nueva Deuda'}
                    </button>
                </div>

                {/* Formulario nueva deuda */}
                {showForm && (
                    <div className="bg-white shadow rounded-lg p-6 mb-6">
                        <h3 className="text-subtitle text-lg mb-4">Registrar Nueva Deuda</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-body text-sm font-medium">Concepto</label>
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
                                    <label className="block text-body text-sm font-medium">Saldo Inicial</label>
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
                                    <label className="block text-body text-sm font-medium">Pago Mensual</label>
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
                                    <label className="block text-body text-sm font-medium">Tasa de Interés (%)</label>
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
                                    <label className="block text-body text-sm font-medium">Fecha de Inicio</label>
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
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                >
                                    Guardar Deuda
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Resumen total deudas */}
                <div className="bg-white shadow rounded-lg p-6 mb-6">
                    <p className="text-body">Tus deudas suman:</p>
                    <p className="text-3xl font-bold text-red-600">{formatearMoneda(totalDeudas)}</p>
                </div>

                {/* Listado de deudas */}
                <div className="space-y-6">
                    {deudas.map((deuda) => {
                        const ultimoPago = deuda.payments[0]
                        const saldoActual = ultimoPago?.remainingBalance ?? deuda.initialAmount
                        const tiempoRestante = calcularTiempoRestante(deuda)

                        return (
                            <div key={deuda.id} className="bg-white shadow rounded-lg overflow-hidden">
                                {/* Cabecera de la deuda */}
                                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-subtitle text-lg">{deuda.concept}</h3>
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
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Fecha</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Interés</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Abono Capital</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Pago Extra</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Pago Total</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Saldo Final</th>
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

                                {/* Botón para registrar pago */}
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