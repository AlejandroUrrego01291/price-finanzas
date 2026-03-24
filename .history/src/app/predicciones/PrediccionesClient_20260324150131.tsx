'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar
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

type Deuda = {
    id: string
    concept: string
    monthlyPayment: number
    payments: { remainingBalance: number }[]
    initialAmount: number
}

type Ahorro = {
    id: string
    concept: string
    monthlySaving: number
    contributions: { totalSaved: number }[]
    targetAmount: number
}

type Props = {
    transacciones: Transaccion[]
    conceptos: Concepto[]
    deudas: Deuda[]
    ahorros: Ahorro[]
}

type PatronRecurrente = {
    conceptName: string
    type: string
    diaMes: number
    monto: number
    confianza: number
    fixedDate: number | null
    subType: string | null
    esFijo: boolean
}

type MesProyectado = {
    mes: string
    fecha: string
    ingresos: number
    gastos: number
    gastosFijos: number
    gastosVariables: number
    deudas: number
    ahorros: number
    saldo: number
    deficit: boolean
    eventos: {
        conceptName: string
        type: string
        monto: number
        confianza: number
        esFijo: boolean
    }[]
}

export default function PrediccionesClient({ transacciones, conceptos, deudas, ahorros }: Props) {
    const router = useRouter()

    // 1. Calcular saldo inicial automáticamente desde transacciones históricas
    const saldoCalculado = useMemo(() => {
        const ingresos = transacciones
            .filter(t => t.type === 'INGRESO')
            .reduce((sum, t) => sum + t.value, 0)
        const gastos = transacciones
            .filter(t => t.type === 'GASTO')
            .reduce((sum, t) => sum + t.value, 0)
        return ingresos - gastos
    }, [transacciones])

    const [fechaPrediccion, setFechaPrediccion] = useState<string>(
        new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0]
    )
    const [saldoInicial, setSaldoInicial] = useState<number>(saldoCalculado)
    const [saldoManual, setSaldoManual] = useState(false)
    const [vistaActiva, setVistaActiva] = useState<'grafico' | 'tabla' | 'calendario'>('grafico')

    // 2. Detectar patrones: mensual, quincenal y bimestral
    const patronesRecurrentes = useMemo(() => {
        const patrones: PatronRecurrente[] = []

        conceptos.forEach(concepto => {
            if (concepto.fixedDate && concepto.value) {
                patrones.push({
                    conceptName: concepto.name,
                    type: concepto.type,
                    diaMes: concepto.fixedDate,
                    monto: concepto.value,
                    confianza: 1.0,
                    fixedDate: concepto.fixedDate,
                    subType: concepto.subType,
                    esFijo: true
                })
            }
        })

        const transaccionesPorConcepto: { [key: string]: Transaccion[] } = {}
        transacciones.forEach(t => {
            if (!transaccionesPorConcepto[t.conceptName]) {
                transaccionesPorConcepto[t.conceptName] = []
            }
            transaccionesPorConcepto[t.conceptName].push(t)
        })

        Object.entries(transaccionesPorConcepto).forEach(([conceptName, txs]) => {
            if (patrones.some(p => p.conceptName === conceptName)) return
            if (txs.length < 2) return

            txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

            const diferencias: number[] = []
            for (let i = 1; i < txs.length; i++) {
                const diffDays = Math.ceil(
                    Math.abs(new Date(txs[i].date).getTime() - new Date(txs[i - 1].date).getTime())
                    / (1000 * 60 * 60 * 24)
                )
                diferencias.push(diffDays)
            }

            const promedioDiff = diferencias.reduce((a, b) => a + b, 0) / diferencias.length
            const montos = txs.map(t => t.value)
            const montoPromedio = montos.reduce((a, b) => a + b, 0) / montos.length
            const desviacion = Math.sqrt(
                montos.map(m => Math.pow(m - montoPromedio, 2)).reduce((a, b) => a + b, 0) / montos.length
            )
            const confianza = Math.min(1 - (desviacion / montoPromedio), 1)
            const diasMes = txs.map(t => new Date(t.date).getDate())
            const diaMasComun = diasMes.sort((a, b) =>
                diasMes.filter(v => v === a).length - diasMes.filter(v => v === b).length
            ).pop() || 1

            // Mensual
            if (promedioDiff >= 25 && promedioDiff <= 35) {
                patrones.push({
                    conceptName,
                    type: txs[0].type,
                    diaMes: diaMasComun,
                    monto: montoPromedio,
                    confianza,
                    fixedDate: null,
                    subType: txs[0].concept?.subType || null,
                    esFijo: txs[0].concept?.subType === 'FIJO'
                })
            }
            // Quincenal — suma ambas quincenas como un solo monto mensual
            else if (promedioDiff >= 12 && promedioDiff <= 18) {
                patrones.push({
                    conceptName: `${conceptName} (quincenal)`,
                    type: txs[0].type,
                    diaMes: 1,
                    monto: montoPromedio * 2,
                    confianza,
                    fixedDate: null,
                    subType: txs[0].concept?.subType || null,
                    esFijo: false
                })
            }
            // Bimestral — divide a la mitad para proyección mensual
            else if (promedioDiff >= 55 && promedioDiff <= 65) {
                patrones.push({
                    conceptName: `${conceptName} (bimestral)`,
                    type: txs[0].type,
                    diaMes: diaMasComun,
                    monto: montoPromedio / 2,
                    confianza,
                    fixedDate: null,
                    subType: txs[0].concept?.subType || null,
                    esFijo: false
                })
            }
        })

        return patrones.sort((a, b) => b.confianza - a.confianza)
    }, [transacciones, conceptos])

    // 3. Pagos mensuales de deudas activas
    const pagoDeudas = useMemo(() => {
        return deudas.reduce((sum, d) => {
            const saldo = d.payments[0]?.remainingBalance ?? d.initialAmount
            return saldo > 0 ? sum + d.monthlyPayment : sum
        }, 0)
    }, [deudas])

    // 4. Aportes mensuales de metas de ahorro activas
    const aportesAhorros = useMemo(() => {
        return ahorros.reduce((sum, a) => {
            const ahorrado = a.contributions[0]?.totalSaved ?? 0
            return ahorrado < a.targetAmount ? sum + a.monthlySaving : sum
        }, 0)
    }, [ahorros])

    // 5. Proyección mes a mes
    const proyeccion = useMemo((): MesProyectado[] => {
        const hoy = new Date()
        hoy.setHours(0, 0, 0, 0)
        const fechaFin = new Date(fechaPrediccion)
        fechaFin.setHours(0, 0, 0, 0)
        if (fechaFin <= hoy) return []

        const meses: MesProyectado[] = []
        let saldoActual = saldoInicial
        let cursor = new Date(hoy.getFullYear(), hoy.getMonth(), 1)

        while (cursor <= fechaFin) {
            const año = cursor.getFullYear()
            const mes = cursor.getMonth()

            let ingresosMes = 0
            let gastosFijosMes = 0
            let gastosVariablesMes = 0
            const eventos: MesProyectado['eventos'] = []

            patronesRecurrentes.forEach(patron => {
                const diaEvento = Math.min(patron.diaMes, new Date(año, mes + 1, 0).getDate())
                const fechaEvento = new Date(año, mes, diaEvento)
                if (fechaEvento > hoy && fechaEvento <= fechaFin) {
                    if (patron.type === 'INGRESO') {
                        ingresosMes += patron.monto
                    } else {
                        if (patron.esFijo || patron.subType === 'FIJO') {
                            gastosFijosMes += patron.monto
                        } else {
                            gastosVariablesMes += patron.monto
                        }
                    }
                    eventos.push({
                        conceptName: patron.conceptName,
                        type: patron.type,
                        monto: patron.monto,
                        confianza: patron.confianza,
                        esFijo: patron.esFijo
                    })
                }
            })

            const gastosTotalesMes = gastosFijosMes + gastosVariablesMes + pagoDeudas + aportesAhorros
            saldoActual = saldoActual + ingresosMes - gastosTotalesMes

            const nombreMes = cursor.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
            meses.push({
                mes: nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1),
                fecha: cursor.toISOString().split('T')[0],
                ingresos: ingresosMes,
                gastos: gastosFijosMes + gastosVariablesMes,
                gastosFijos: gastosFijosMes,
                gastosVariables: gastosVariablesMes,
                deudas: pagoDeudas,
                ahorros: aportesAhorros,
                saldo: saldoActual,
                deficit: saldoActual < 0,
                eventos
            })

            cursor.setMonth(cursor.getMonth() + 1)
        }

        return meses
    }, [patronesRecurrentes, fechaPrediccion, saldoInicial, pagoDeudas, aportesAhorros])

    // 6. Estadísticas
    const estadisticas = useMemo(() => {
        if (proyeccion.length === 0) return null
        const mesesDeficit = proyeccion.filter(m => m.deficit).length
        const promedioIngresos = proyeccion.reduce((s, m) => s + m.ingresos, 0) / proyeccion.length
        const promedioGastos = proyeccion.reduce((s, m) => s + m.gastos + m.deudas + m.ahorros, 0) / proyeccion.length
        const totalFijos = proyeccion.reduce((s, m) => s + m.gastosFijos, 0)
        const totalVariables = proyeccion.reduce((s, m) => s + m.gastosVariables, 0)
        const totalGastos = totalFijos + totalVariables
        const pctFijos = totalGastos > 0 ? Math.round((totalFijos / totalGastos) * 100) : 0
        const pctVariables = totalGastos > 0 ? Math.round((totalVariables / totalGastos) * 100) : 0
        return { mesesDeficit, promedioIngresos, promedioGastos, pctFijos, pctVariables }
    }, [proyeccion])

    const saldoProyectado = proyeccion.length > 0 ? proyeccion[proyeccion.length - 1].saldo : saldoInicial

    const formatearMoneda = (valor: number) => new Intl.NumberFormat('es-CO', {
        style: 'currency', currency: 'COP', minimumFractionDigits: 0
    }).format(valor)

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null
        return (
            <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4 text-sm">
                <p className="font-semibold text-gray-800 mb-2">{label}</p>
                {payload.map((entry: any) => (
                    <p key={entry.name} style={{ color: entry.color }}>
                        {entry.name}: {formatearMoneda(entry.value)}
                    </p>
                ))}
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <nav className="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-50 border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        <div className="flex items-center">
                            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                Mis finanzas
                            </h1>
                            <span className="ml-3 text-sm font-medium text-gray-600 hidden md:inline-block">
                                Predicciones Financieras
                            </span>
                        </div>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="px-3 py-1.5 md:px-5 md:py-2.5 text-xs md:text-sm font-medium text-gray-700 hover:text-white border-2 border-gray-300 rounded-full hover:bg-gray-600 hover:border-gray-600 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg flex items-center space-x-2"
                        >
                            <span>←</span>
                            <span>Volver al Dashboard</span>
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">

                {/* Configuración */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Configurar Predicción</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Saldo Inicial
                                <span className="ml-2 text-xs text-gray-400">
                                    {saldoManual ? '(editado manualmente)' : '(calculado automáticamente)'}
                                </span>
                            </label>
                            <div className="flex space-x-2">
                                <input
                                    type="number"
                                    value={saldoInicial}
                                    onChange={(e) => {
                                        setSaldoInicial(Number(e.target.value))
                                        setSaldoManual(true)
                                    }}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                                {saldoManual && (
                                    <button
                                        onClick={() => {
                                            setSaldoInicial(saldoCalculado)
                                            setSaldoManual(false)
                                        }}
                                        className="px-3 py-2 text-xs bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200"
                                        title="Restaurar valor calculado"
                                    >
                                        ↺
                                    </button>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Proyección</label>
                            <input
                                type="date"
                                value={fechaPrediccion}
                                onChange={(e) => setFechaPrediccion(e.target.value)}
                                min={new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                        </div>
                        <div className={`p-4 rounded-lg ${saldoProyectado >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                            <p className="text-xs font-medium text-gray-500 mb-1">Saldo Proyectado Final</p>
                            <p className={`text-2xl font-bold ${saldoProyectado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatearMoneda(saldoProyectado)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Estadísticas resumidas */}
                {estadisticas && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white shadow rounded-lg p-4">
                            <p className="text-xs text-gray-500 mb-1">Meses con déficit</p>
                            <p className={`text-2xl font-bold ${estadisticas.mesesDeficit > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {estadisticas.mesesDeficit}
                            </p>
                            <p className="text-xs text-gray-400">de {proyeccion.length} meses</p>
                        </div>
                        <div className="bg-white shadow rounded-lg p-4">
                            <p className="text-xs text-gray-500 mb-1">Ingreso promedio/mes</p>
                            <p className="text-lg font-bold text-green-600">{formatearMoneda(estadisticas.promedioIngresos)}</p>
                        </div>
                        <div className="bg-white shadow rounded-lg p-4">
                            <p className="text-xs text-gray-500 mb-1">Gasto promedio/mes</p>
                            <p className="text-lg font-bold text-red-600">{formatearMoneda(estadisticas.promedioGastos)}</p>
                        </div>
                        <div className="bg-white shadow rounded-lg p-4">
                            <p className="text-xs text-gray-500 mb-2">Gastos fijos vs variables</p>
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                                <div
                                    className="bg-red-500 h-2 rounded-full"
                                    style={{ width: `${estadisticas.pctFijos}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>Fijos {estadisticas.pctFijos}%</span>
                                <span>Variables {estadisticas.pctVariables}%</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Deudas y ahorros integrados */}
                {(pagoDeudas > 0 || aportesAhorros > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pagoDeudas > 0 && (
                            <div className="bg-white shadow rounded-lg p-4 border-l-4 border-red-400">
                                <p className="text-sm font-medium text-gray-700 mb-1">💳 Pagos de deudas incluidos</p>
                                <p className="text-xl font-bold text-red-600">{formatearMoneda(pagoDeudas)}/mes</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {deudas.filter(d => (d.payments[0]?.remainingBalance ?? d.initialAmount) > 0).length} deuda(s) activa(s)
                                </p>
                            </div>
                        )}
                        {aportesAhorros > 0 && (
                            <div className="bg-white shadow rounded-lg p-4 border-l-4 border-blue-400">
                                <p className="text-sm font-medium text-gray-700 mb-1">🐷 Aportes de ahorro incluidos</p>
                                <p className="text-xl font-bold text-blue-600">{formatearMoneda(aportesAhorros)}/mes</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {ahorros.filter(a => (a.contributions[0]?.totalSaved ?? 0) < a.targetAmount).length} meta(s) activa(s)
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Patrones detectados */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Patrones Recurrentes Detectados</h3>
                    {patronesRecurrentes.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {patronesRecurrentes.map((patron, index) => (
                                <div key={index} className={`p-4 rounded-lg border ${patron.type === 'INGRESO'
                                    ? 'border-green-200 bg-green-50'
                                    : 'border-red-200 bg-red-50'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="font-medium text-gray-900 text-sm">{patron.conceptName}</p>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${patron.type === 'INGRESO'
                                                ? 'bg-green-200 text-green-800'
                                                : 'bg-red-200 text-red-800'}`}>
                                                {patron.type}
                                            </span>
                                            {patron.esFijo && (
                                                <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded-full">FIJO</span>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2">
                                        Día {patron.diaMes} de cada mes
                                        {patron.fixedDate && ' ✓ configurado'}
                                    </p>
                                    <p className={`text-lg font-bold ${patron.type === 'INGRESO' ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatearMoneda(patron.monto)}
                                    </p>
                                    {!patron.fixedDate && (
                                        <div className="mt-2">
                                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                <div
                                                    className="bg-blue-400 h-1.5 rounded-full"
                                                    style={{ width: `${Math.max(patron.confianza * 100, 5)}%` }}
                                                />
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">Confianza: {(patron.confianza * 100).toFixed(0)}%</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-8">
                            No se detectaron patrones. Registra más transacciones o configura días fijos en Conceptos.
                        </p>
                    )}
                </div>

                {/* Vistas: gráfico, tabla, calendario */}
                {proyeccion.length > 0 && (
                    <div className="bg-white shadow rounded-lg overflow-hidden">
                        <div className="flex border-b border-gray-200">
                            {(['grafico', 'tabla', 'calendario'] as const).map(vista => (
                                <button
                                    key={vista}
                                    onClick={() => setVistaActiva(vista)}
                                    className={`px-4 md:px-6 py-3 text-sm font-medium transition-colors ${vistaActiva === vista
                                        ? 'border-b-2 border-blue-600 text-blue-600'
                                        : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    {vista === 'grafico' ? '📈 Gráfico' : vista === 'tabla' ? '📋 Tabla' : '📅 Detalle'}
                                </button>
                            ))}
                        </div>

                        {/* Gráfico */}
                        {vistaActiva === 'grafico' && (
                            <div className="p-6 space-y-8">
                                <div>
                                    <h3 className="text-base font-semibold text-gray-800 mb-4">Proyección de Saldo</h3>
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={proyeccion} margin={{ top: 10, right: 20, left: 80, bottom: 10 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                <XAxis dataKey="mes" tick={{ fill: '#6B7280', fontSize: 11 }} />
                                                <YAxis tickFormatter={(v) => formatearMoneda(v)} tick={{ fill: '#6B7280', fontSize: 11 }} width={90} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Legend />
                                                <Line type="monotone" dataKey="ingresos" stroke="#10B981" strokeWidth={2} name="Ingresos" dot={false} />
                                                <Line type="monotone" dataKey="gastos" stroke="#EF4444" strokeWidth={2} name="Gastos" dot={false} />
                                                <Line type="monotone" dataKey="saldo" stroke="#3B82F6" strokeWidth={3} name="Saldo"
                                                    dot={(props: any) => {
                                                        const { cx, cy, payload } = props
                                                        return payload.deficit
                                                            ? <circle key={cx} cx={cx} cy={cy} r={5} fill="#EF4444" stroke="#fff" strokeWidth={2} />
                                                            : <circle key={cx} cx={cx} cy={cy} r={4} fill="#3B82F6" stroke="#fff" strokeWidth={2} />
                                                    }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-gray-800 mb-4">Composición de Gastos por Mes</h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={proyeccion} margin={{ top: 10, right: 20, left: 80, bottom: 10 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                <XAxis dataKey="mes" tick={{ fill: '#6B7280', fontSize: 11 }} />
                                                <YAxis tickFormatter={(v) => formatearMoneda(v)} tick={{ fill: '#6B7280', fontSize: 11 }} width={90} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Legend />
                                                <Bar dataKey="gastosFijos" stackId="a" fill="#EF4444" name="Gastos Fijos" />
                                                <Bar dataKey="gastosVariables" stackId="a" fill="#F97316" name="Gastos Variables" />
                                                <Bar dataKey="deudas" stackId="a" fill="#8B5CF6" name="Deudas" />
                                                <Bar dataKey="ahorros" stackId="a" fill="#3B82F6" name="Ahorros" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tabla resumen */}
                        {vistaActiva === 'tabla' && (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mes</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ingresos</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">G. Fijos</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">G. Variables</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Deudas</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ahorros</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {proyeccion.map((mes, i) => (
                                            <tr key={i} className={mes.deficit ? 'bg-red-50' : 'hover:bg-gray-50'}>
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                    {mes.deficit && <span className="mr-1">⚠️</span>}
                                                    {mes.mes}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right text-green-600">{formatearMoneda(mes.ingresos)}</td>
                                                <td className="px-4 py-3 text-sm text-right text-red-500">{formatearMoneda(mes.gastosFijos)}</td>
                                                <td className="px-4 py-3 text-sm text-right text-orange-500">{formatearMoneda(mes.gastosVariables)}</td>
                                                <td className="px-4 py-3 text-sm text-right text-purple-500">{formatearMoneda(mes.deudas)}</td>
                                                <td className="px-4 py-3 text-sm text-right text-blue-500">{formatearMoneda(mes.ahorros)}</td>
                                                <td className={`px-4 py-3 text-sm text-right font-bold ${mes.deficit ? 'text-red-600' : 'text-blue-600'}`}>
                                                    {formatearMoneda(mes.saldo)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Detalle mensual */}
                        {vistaActiva === 'calendario' && (
                            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                                {proyeccion.map((mes, i) => (
                                    <div key={i} className={`p-6 ${mes.deficit ? 'bg-red-50' : ''}`}>
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="font-semibold text-gray-900">
                                                {mes.deficit && <span className="mr-2 text-red-500">⚠️ DÉFICIT</span>}
                                                {mes.mes}
                                            </h4>
                                            <span className={`text-sm font-bold ${mes.deficit ? 'text-red-600' : 'text-blue-600'}`}>
                                                Saldo: {formatearMoneda(mes.saldo)}
                                            </span>
                                        </div>
                                        {mes.eventos.length > 0 ? (
                                            <div className="space-y-2 mb-3">
                                                {mes.eventos.map((evento, j) => (
                                                    <div key={j} className="flex justify-between items-center text-sm bg-white rounded-lg px-3 py-2 shadow-sm">
                                                        <div className="flex items-center space-x-2">
                                                            <span>{evento.type === 'INGRESO' ? '💰' : '💸'}</span>
                                                            <span className="text-gray-700">{evento.conceptName}</span>
                                                            {evento.esFijo && (
                                                                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">FIJO</span>
                                                            )}
                                                            {evento.confianza < 1 && (
                                                                <span className="text-xs text-gray-400">({(evento.confianza * 100).toFixed(0)}%)</span>
                                                            )}
                                                        </div>
                                                        <span className={`font-medium ${evento.type === 'INGRESO' ? 'text-green-600' : 'text-red-600'}`}>
                                                            {formatearMoneda(evento.monto)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-400 mb-3">Sin eventos detectados este mes</p>
                                        )}
                                        <div className="pt-3 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                            <span className="text-green-600">↑ Ingresos: {formatearMoneda(mes.ingresos)}</span>
                                            <span className="text-red-500">↓ Fijos: {formatearMoneda(mes.gastosFijos)}</span>
                                            <span className="text-orange-500">↓ Variables: {formatearMoneda(mes.gastosVariables)}</span>
                                            <span className="text-purple-500">↓ Deudas+Ahorros: {formatearMoneda(mes.deudas + mes.ahorros)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {proyeccion.length === 0 && patronesRecurrentes.length > 0 && (
                    <div className="bg-white shadow rounded-lg p-12 text-center">
                        <p className="text-gray-400 text-lg">Selecciona una fecha futura para ver la proyección</p>
                    </div>
                )}
            </main>
        </div>
    )
}