import { auth } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import PrediccionesClient from './PrediccionesClient'

export default async function PrediccionesPage() {
    const session = await auth()

    if (!session?.user?.id) {
        redirect('/login')
    }

    // Obtener todas las transacciones del último año para análisis
    const haceUnAño = new Date()
    haceUnAño.setFullYear(haceUnAño.getFullYear() - 1)

    const transaccionesDB = await prisma.transaction.findMany({
        where: {
            userId: session.user.id,
            date: {
                gte: haceUnAño
            }
        },
        orderBy: {
            date: 'asc'
        },
        include: {
            concept: true
        }
    })

    // Convertir fechas de Date a string - Versión explícita
    const transacciones = transaccionesDB.map(t => ({
        id: t.id,
        type: t.type,
        conceptName: t.conceptName,
        value: t.value,
        date: t.date.toISOString().split('T')[0],  // ← Ahora es string
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

    // Obtener conceptos para análisis de recurrencia
    const conceptosDB = await prisma.concept.findMany({
        where: {
            userId: session.user.id,
            isActive: true
        }
    })

    // Convertir conceptos
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

    return (
        <PrediccionesClient
            transacciones={transacciones}
            conceptos={conceptos}
        />
    )
}