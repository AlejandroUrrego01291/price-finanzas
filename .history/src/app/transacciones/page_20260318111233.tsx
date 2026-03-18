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

    // Convertir conceptos - Versión explícita
    const conceptos = conceptosDB.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        category: c.category,
        subType: c.subType,
        value: c.value,
        fixedDate: c.fixedDate,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        userId: c.userId,
        isActive: c.isActive
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

    // Convertir transacciones - Versión explícita (sin spread)
    const transacciones = transaccionesDB.map(t => ({
        id: t.id,
        type: t.type,
        conceptName: t.conceptName,
        value: t.value,
        date: t.date.toISOString().split('T')[0], // ← Ahora TypeScript lo ve como string
        category: t.category,
        subType: t.subType,
        createdAt: t.createdAt,
        userId: t.userId,
        conceptId: t.conceptId,
        concept: t.concept ? {
            id: t.concept.id,
            name: t.concept.name,
            type: t.concept.type,
            category: t.concept.category,
            subType: t.concept.subType,
            value: t.concept.value,
            fixedDate: t.concept.fixedDate,
            createdAt: t.concept.createdAt,
            updatedAt: t.concept.updatedAt,
            userId: t.concept.userId,
            isActive: t.concept.isActive
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