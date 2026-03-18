'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area
} from 'recharts'

// Definición de tipos
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
        value: number | null
        fixedDate: number | null
    } | null
}

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
    transacciones: Transaccion[]
    conceptos: Concepto[]
}

type PatronRecurrente = {
    conceptName: string
    type: string
    diaMes: number
    monto: number
    confianza: number
    fixedDate: number | null
}

export default function PrediccionesClient({ transacciones, conceptos }: Props) {
    const router = useRouter()
    const [fechaPrediccion, setFechaPrediccion] = useState<string>(
        new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0]
    )
    const [saldoInicial, setSaldoInicial] = useState<number>(0)

    // Analizar patrones recurrentes usando días fijos de conceptos cuando existen
    const patronesRecurrentes = useMemo(() => {
        const patrones: PatronRecurrente[] = []

        // Primero, usar conceptos con día fijo
        conceptos.forEach(concepto => {
            if (concepto.fixedDate && concepto.value) {
                patrones.push({
                    conceptName: concepto.name,
                    type: concepto.type,
                    diaMes: concepto.fixedDate,
                    monto: concepto.value,
                    confianza: 1.0,
                    fixedDate: concepto.fixedDate
                })
            }
        })

        // Luego, analizar transacciones para detectar patrones en conceptos sin día fijo
        const transaccionesPorConcepto: { [key: string]: Transaccion[] } = {}

        transacciones.forEach(t => {
            if (!transaccionesPorConcepto[t.conceptName]) {
                transaccionesPorConcepto[t.conceptName] = []
            }
            transaccionesPorConcepto[t.conceptName].push(t)
        })

        Object.entries(transaccionesPorConcepto).forEach(([conceptName, transacciones]) => {
            // Si ya tenemos el concepto con día fijo, no lo analizamos de nuevo
            if (patrones.some(p => p.conceptName === conceptName)) return

            if (transacciones.length < 2) return

            transacciones.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

            const diferencias: number[] = []
            for (let i = 1; i < transacciones.length; i++) {
                const fechaAnterior = new Date(transacciones[i - 1].date)
                const fechaActual = new Date(transacciones[i].date)
                const diffTime = Math.abs(fechaActual.getTime() - fechaAnterior.getTime())
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                diferencias.push(diffDays)
            }

            const promedioDiff = diferencias.reduce((a, b) => a + b, 0) / diferencias.length

            if (promedioDiff >= 25 && promedioDiff <= 35) {
                const montos = transacciones.map(t => t.value)
                const montoPromedio = montos.reduce((a, b) => a + b, 0) / montos.length
                const desviacion = Math.sqrt(montos.map(m => Math.pow(m - montoPromedio, 2)).reduce((a, b) => a + b, 0) / montos.length)
                const confianza = 1 - (desviacion / montoPromedio)

                const diasMes = transacciones.map(t => new Date(t.date).getDate())
                const diaMasComun = diasMes.sort((a, b) =>
                    diasMes.filter(v => v === a).length - diasMes.filter(v => v === b).length
                ).pop() || 1

                patrones.push({
                    conceptName,
                    type: transacciones[0].type,
                    diaMes: diaMasComun,
                    monto: montoPromedio,
                    confianza: Math.min(confianza, 1),
                    fixedDate: null
                })
            }
        })

        return patrones.sort((a, b) => b.confianza - a.confianza)
    }, [transacciones, conceptos])

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
                confianza: number
            }[]
        }[] = []

        let saldoActual = saldoInicial

        let fechaActual = new Date(hoy)
        while (fechaActual <= fechaFin) {
            const año = fechaActual.getFullYear()
            const mes = fechaActual.getMonth()
            const eventosDelDia: { conceptName: string; type: string; monto: number; confianza: number }[] = []

            let ingresosMes = 0
            let gastosMes = 0

            patronesRecurrentes.forEach(patron => {
                const fechaEvento = new Date(año, mes, patron.diaMes)

                if (fechaEvento >= hoy && fechaEvento <= fechaFin) {
                    if (patron.type === 'INGRESO') {
                        ingresosMes += patron.monto
                    } else {
                        gastosMes += patron.monto
                    }
                    eventosDelDia.push({
                        conceptName: patron.conceptName,
                        type: patron.type,
                        monto: patron.monto,
                        confianza: patron.confianza
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Navbar moderno con efecto glassmorphism */}
            <nav className="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-50 border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        {/* Logo con gradiente */}
                        <div className="flex items-center">
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                Price
                            </h1>
                            <span className="ml-3 text-sm font-medium text-gray-600 hidden md:inline-block">
                                Predicciones Financieras
                            </span>
                        </div>

                        {/* Botón de volver */}
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
                {/* Controles de predicción */}
                <div className="bg-white shadow rounded-lg p-6 mb-6">
                    <h2 className="text-subtitle text-lg mb-4">Configurar Predicción</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-body text-sm font-medium mb-1">
                                Saldo Inicial
                            </label>
                            <input
                                type="number"
                                value={saldoInicial}
                                onChange={(e) => setSaldoInicial(Number(e.target.value))}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-body text-sm font-medium mb-1">
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
                                <p className="text-xs text-blue-700 font-medium">Saldo Proyectado</p>
                                <p className={`text-lg font-bold ${saldoProyectado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatearMoneda(saldoProyectado)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Patrones Recurrentes Detectados */}
                <div className="bg-white shadow rounded-lg p-6 mb-6">
                    <h3 className="text-subtitle text-lg mb-4">Patrones Recurrentes Detectados</h3>
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
                                                {patron.fixedDate && ' (configurado)'}
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
                                        {formatearMoneda(patron.monto)}
                                    </p>
                                    {!patron.fixedDate && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            Confianza: {(patron.confianza * 100).toFixed(0)}%
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-8">
                            No se detectaron patrones recurrentes. Registra más transacciones o configura días fijos en conceptos.
                        </p>
                    )}
                </div>

                {/* Gráfico de Proyección */}
                {predicciones.length > 0 && (
                    <div className="bg-white shadow rounded-lg p-6 mb-6">
                        <h3 className="text-subtitle text-lg mb-4">Proyección Financiera</h3>
                        <div className="h-96 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={predicciones}
                                    margin={{ top: 20, right: 30, left: 80, bottom: 20 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="fecha"
                                        tick={{ fill: '#374151', fontSize: 12 }}
                                    />
                                    <YAxis
                                        tickFormatter={(value) => formatearMoneda(value)}
                                        tick={{ fill: '#374151', fontSize: 12 }}
                                        width={100}
                                    />
                                    <Tooltip
                                        formatter={(value) => formatearMoneda(Number(value))}
                                        contentStyle={{
                                            backgroundColor: 'white',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            padding: '8px'
                                        }}
                                    />
                                    <Legend />
                                    <Area
                                        type="monotone"
                                        dataKey="ingresos"
                                        stackId="1"
                                        stroke="#10B981"
                                        fill="#10B981"
                                        name="Ingresos"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="gastos"
                                        stackId="1"
                                        stroke="#EF4444"
                                        fill="#EF4444"
                                        name="Gastos"
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="saldo"
                                        stroke="#3B82F6"
                                        strokeWidth={2}
                                        name="Saldo Proyectado"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Calendario de Eventos Proyectados */}
                {predicciones.length > 0 && (
                    <div className="bg-white shadow rounded-lg overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                            <h3 className="text-subtitle text-lg">Calendario de Eventos Proyectados</h3>
                        </div>
                        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
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
                                                        <span className="text-gray-700">
                                                            {evento.conceptName}
                                                            {evento.confianza < 1 && (
                                                                <span className="ml-1 text-xs text-gray-400">
                                                                    ({(evento.confianza * 100).toFixed(0)}% conf)
                                                                </span>
                                                            )}
                                                        </span>
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
                )}
            </main>
        </div>
    )
}