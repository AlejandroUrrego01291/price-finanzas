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

    // Obtener conceptos para análisis de recurrencia
    const conceptosDB = await prisma.concept.findMany({
        where: {
            userId: session.user.id,
            isActive: true
        }
    })

    // Convertir conceptos (aunque no tienen fechas, por consistencia)
    const conceptos = conceptosDB.map(c => ({
        ...c,
        fixedDate: c.fixedDate,
        value: c.value
    }))

    return (
        <PrediccionesClient
            transacciones={transacciones}
            conceptos={conceptos}
        />
    )
}