import { auth } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import TransaccionesClient from './TransaccionesClient'

export default async function TransaccionesPage() {
    const session = await auth()

    if (!session?.user?.id) {
        redirect('/login')
    }

    // Obtener conceptos activos del usuario
    const conceptosDB = await prisma.concept.findMany({
        where: {
            userId: session.user.id,
            isActive: true
        },
        orderBy: [
            { type: 'asc' },
            { name: 'asc' }
        ]
    })

    // Convertir conceptos (valores y fechas fijas)
    const conceptos = conceptosDB.map(c => ({
        ...c,
        fixedDate: c.fixedDate,
        value: c.value
    }))

    // Obtener transacciones del mes actual
    const hoy = new Date()
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)

    const transaccionesDB = await prisma.transaction.findMany({
        where: {
            userId: session.user.id,
            date: {
                gte: primerDiaMes,
                lte: ultimoDiaMes
            }
        },
        orderBy: {
            date: 'desc'
        },
        include: {
            concept: true
        }
    })

    // Convertir fechas de Date a string
    const transacciones = transaccionesDB.map(t => ({
        ...t,
        date: t.date.toISOString().split('T')[0],
        concept: t.concept ? {
            ...t.concept,
            fixedDate: t.concept.fixedDate,
            value: t.concept.value
        } : null
    }))

    // Calcular totales
    const totalIngresos = transacciones
        .filter(t => t.type === 'INGRESO')
        .reduce((sum, t) => sum + t.value, 0)

    const totalGastos = transacciones
        .filter(t => t.type === 'GASTO')
        .reduce((sum, t) => sum + t.value, 0)

    return (
        <TransaccionesClient
            conceptos={conceptos}
            transacciones={transacciones}
            totalIngresos={totalIngresos}
            totalGastos={totalGastos}
        />
    )
}