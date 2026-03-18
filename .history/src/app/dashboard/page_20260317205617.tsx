import { auth } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
    const session = await auth()

    if (!session?.user?.id) {
        redirect('/login')
    }

    // Obtener todas las transacciones del usuario
    const transacciones = await prisma.transaction.findMany({
        where: {
            userId: session.user.id
        },
        orderBy: {
            date: 'desc'
        },
        include: {
            concept: true
        }
    })

    // Obtener meses disponibles
    const mesesDisponibles = Array.from(new Set(
        transacciones.map(t => {
            const fecha = new Date(t.date)
            return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
        })
    )).sort().reverse()

    return (
        <DashboardClient
            transacciones={transacciones}
            mesesDisponibles={mesesDisponibles}
        />
    )
}