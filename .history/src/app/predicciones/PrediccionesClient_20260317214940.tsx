'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area
} from 'recharts'

type Transaccion = {
    id: string
    type: string
    conceptName: string
    value: number
    date: string
    category: string | null
    subType: string | null
    concept: {
        id: string
        name: string
        category: string | null
        subType: string | null
    } | null
}

type Concepto = {
    id: string
    type: string
    name: string
    category: string | null
    subType: string | null
}

type Props = {
    transacciones: Transaccion[]
    conceptos: Concepto[]
}

type PatronRecurrente = {
    conceptName: string
    type: string
    diaMes: number
    montoPromedio: number
    frecuencia: 'mensual'
    confianza: number // 0-1
}

export default function PrediccionesClient({ transacciones, conceptos }: Props) {
    const router = useRouter()
    const [fechaPrediccion, setFechaPrediccion] = useState<string>(
        new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0]
    )
    const [saldoInicial, setSaldoInicial] = useState<number>(0)

    // Analizar patrones recurrentes
    const patronesRecurrentes = useMemo(() => {
        const patrones: PatronRecurrente[] = []
        const transaccionesPorConcepto: { [key: string]: Transaccion[] } = {}

        // Agrupar por concepto
        transacciones.forEach(t => {
            if (!transaccionesPorConcepto[t.conceptName]) {
                transaccionesPorConcepto[t.conceptName] = []
            }
            transaccionesPorConcepto[t.conceptName].push(t)
        })

        // Analizar cada concepto
        Object.entries(transaccionesPorConcepto).forEach(([conceptName, transacciones]) => {
            if (transacciones.length < 2) return // Necesitamos al menos 2 ocurrencias

            // Ordenar por fecha
            transacciones.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

            // Calcular diferencias en días entre transacciones consecutivas
            const diferencias: number[] = []
            for (let i = 1; i < transacciones.length; i++) {
                const fechaAnterior = new Date(transacciones[i - 1].date)
                const fechaActual = new Date(transacciones[i].date)
                const diffTime = Math.abs(fechaActual.getTime() - fechaAnterior.getTime())
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                diferencias.push(diffDays)
            }

            // Calcular promedio de diferencias
            const promedioDiff = diferencias.reduce((a, b) => a + b, 0) / diferencias.length

            // Si el promedio está cerca de 30 días (±5 días), es mensual
            if (promedioDiff >= 25 && promedioDiff <= 35) {
                const montos = transacciones.map(t => t.value)
                const montoPromedio = montos.reduce((a, b) => a + b, 0) / montos.length
                const desviacion = Math.sqrt(montos.map(m => Math.pow(m - montoPromedio, 2)).reduce((a, b) => a + b, 0) / montos.length)
                const confianza = 1 - (desviacion / montoPromedio) // Entre más pequeña la desviación, más confianza

                // Determinar día del mes típico
                const diasMes = transacciones.map(t => new Date(t.date).getDate())
                const diaMasComun = diasMes.sort((a, b) =>
                    diasMes.filter(v => v === a).length - diasMes.filter(v => v === b).length
                ).pop() || 1

                patrones.push({
                    conceptName,
                    type: transacciones[0].type,
                    diaMes: diaMasComun,
                    montoPromedio,
                    frecuencia: 'mensual',
                    confianza: Math.min(confianza, 1)
                })
            }
        })

        return patrones.sort((a, b) => b.confianza - a.confianza)
    }, [transacciones])

    // Generar predicciones hasta la fecha seleccionada
    const predicciones = useMemo(() => {
        const hoy = new Date()
        hoy.setHours(0, 0, 0, 0)

        const fechaFin = new Date(fechaPrediccion)
        fechaFin.setHours(0, 0, 0, 0)

        if (fechaFin <= hoy) return []

        const predicciones: {
            fecha: string
            ingresos: number
            gastos: number
            saldo: number
            eventos: {
                conceptName: string
                type: string
                monto: number
            }[]
        }[] = []

        let saldoActual = saldoInicial

        // Iterar mes a mes hasta la fecha objetivo
        let fechaActual = new Date(hoy)
        while (fechaActual <= fechaFin) {
            const año = fechaActual.getFullYear()
            const mes = fechaActual.getMonth()
            const eventosDelDia: { conceptName: string; type: string; monto: number }[] = []

            // Calcular ingresos y gastos para este mes
            let ingresosMes = 0
            let gastosMes = 0

            patronesRecurrentes.forEach(patron => {
                // Crear fecha del evento para este mes
                const fechaEvento = new Date(año, mes, patron.diaMes)

                // Solo incluir si la fecha está entre hoy y la fecha objetivo
                if (fechaEvento >= hoy && fechaEvento <= fechaFin) {
                    if (patron.type === 'INGRESO') {
                        ingresosMes += patron.montoPromedio
                    } else {
                        gastosMes += patron.montoPromedio
                    }
                    eventosDelDia.push({
                        conceptName: patron.conceptName,
                        type: patron.type,
                        monto: patron.montoPromedio
                    })
                }
            })

            saldoActual = saldoActual + ingresosMes - gastosMes

            predicciones.push({
                fecha: fechaActual.toISOString().split('T')[0],
                ingresos: ingresosMes,
                gastos: gastosMes,
                saldo: saldoActual,
                eventos: eventosDelDia
            })

            // Avanzar al siguiente mes
            fechaActual.setMonth(fechaActual.getMonth() + 1)
        }

        return predicciones
    }, [patronesRecurrentes, fechaPrediccion, saldoInicial])

    const saldoProyectado = useMemo(() => {
        if (predicciones.length === 0) return saldoInicial
        return predicciones[predicciones.length - 1].saldo
    }, [predicciones, saldoInicial])

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
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-xl font-semibold text-gray-900">Price - Predicciones Financieras</h1>
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
                {/* Controles de predicción */}
                <div className="bg-white shadow rounded-lg p-6 mb-6">
                    <h2 className="text-lg font-medium mb-4">Configurar Predicción</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Saldo Inicial
                            </label>
                            <input
                                type="number"
                                value={saldoInicial}
                                onChange={(e) => setSaldoInicial(Number(e.target.value))}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                placeholder="0"
                                min="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Fecha de Proyección
                            </label>
                            <input
                                type="date"
                                value={fechaPrediccion}
                                onChange={(e) => setFechaPrediccion(e.target.value)}
                                min={new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                        </div>
                        <div className="flex items-end">
                            <div className="bg-blue-50 p-3 rounded-lg w-full">
                                <p className="text-xs text-blue-600">Saldo Proyectado</p>
                                <p className={`text-lg font-bold ${saldoProyectado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatearMoneda(saldoProyectado)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Patrones Recurrentes Detectados */}
                <div className="bg-white shadow rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-medium mb-4">Patrones Recurrentes Detectados</h3>
                    {patronesRecurrentes.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {patronesRecurrentes.map((patron, index) => (
                                <div key={index} className={`p-4 rounded-lg border ${patron.type === 'INGRESO' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                                    }`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-medium text-gray-900">{patron.conceptName}</p>
                                            <p className="text-sm text-gray-600">
                                                Día {patron.diaMes} de cada mes
                                            </p>
                                        </div>
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${patron.type === 'INGRESO'
                                                ? 'bg-green-200 text-green-800'
                                                : 'bg-red-200 text-red-800'
                                            }`}>
                                            {patron.type}
                                        </span>
                                    </div>
                                    <p className={`text-lg font-bold mt-2 ${patron.type === 'INGRESO' ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                        {formatearMoneda(patron.montoPromedio)}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Confianza: {(patron.confianza * 100).toFixed(0)}%
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-8">
                            No se detectaron patrones recurrentes. Registra más transacciones para obtener predicciones.
                        </p>
                    )}
                </div>

                {/* Gráfico de Proyección */}
                {predicciones.length > 0 && (
                    <>
                        <div className="bg-white shadow rounded-lg p-6 mb-6">
                            <h3 className="text-lg font-medium mb-4">Proyección Financiera</h3>
                            <ResponsiveContainer width="100%" height={400}>
                                <AreaChart data={predicciones}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="fecha" />
                                    <YAxis tickFormatter={(value) => formatearMoneda(value)} />
                                    <Tooltip formatter={(value) => formatearMoneda(Number(value))} />
                                    <Legend />
                                    <Area type="monotone" dataKey="ingresos" stackId="1" stroke="#10B981" fill="#10B981" name="Ingresos" />
                                    <Area type="monotone" dataKey="gastos" stackId="1" stroke="#EF4444" fill="#EF4444" name="Gastos" />
                                    <Line type="monotone" dataKey="saldo" stroke="#3B82F6" strokeWidth={2} name="Saldo Proyectado" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Calendario de Eventos Proyectados */}
                        <div className="bg-white shadow rounded-lg overflow-hidden">
                            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                                <h3 className="text-lg font-medium">Calendario de Eventos Proyectados</h3>
                            </div>
                            <div className="divide-y divide-gray-200">
                                {predicciones.map((mes, index) => (
                                    <div key={index} className="p-6">
                                        <h4 className="font-medium text-gray-900 mb-3">
                                            {formatearFecha(mes.fecha)}
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm text-gray-600 mb-2">Eventos del mes:</p>
                                                <div className="space-y-2">
                                                    {mes.eventos.map((evento, i) => (
                                                        <div key={i} className="flex justify-between items-center text-sm">
                                                            <span className="text-gray-700">{evento.conceptName}</span>
                                                            <span className={evento.type === 'INGRESO' ? 'text-green-600' : 'text-red-600'}>
                                                                {formatearMoneda(evento.monto)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="text-gray-600">Total Ingresos:</span>
                                                        <span className="text-green-600 font-medium">{formatearMoneda(mes.ingresos)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="text-gray-600">Total Gastos:</span>
                                                        <span className="text-red-600 font-medium">{formatearMoneda(mes.gastos)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm font-medium pt-2 border-t border-gray-200">
                                                        <span className="text-gray-700">Saldo del mes:</span>
                                                        <span className={mes.saldo >= 0 ? 'text-blue-600' : 'text-red-600'}>
                                                            {formatearMoneda(mes.saldo)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    )
}