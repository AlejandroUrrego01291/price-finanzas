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

    const transacciones = await prisma.transaction.findMany({
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

    // Obtener conceptos para análisis de recurrencia
    const conceptos = await prisma.concept.findMany({
        where: {
            userId: session.user.id,
            isActive: true
        }
    })

    return (
        <PrediccionesClient
            transacciones={transacciones}
            conceptos={conceptos}
        />
    )
}