import { auth } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import AhorrosClient from './AhorrosClient'

export default async function AhorrosPage() {
    const session = await auth()

    if (!session?.user?.id) {
        redirect('/login')
    }

    // Obtener todas las metas de ahorro activas del usuario
    const ahorrosDB = await prisma.saving.findMany({
        where: {
            userId: session.user.id,
            isActive: true
        },
        include: {
            contributions: {
                orderBy: {
                    date: 'desc'
                }
            }
        },
        orderBy: {
            startDate: 'desc'
        }
    })

    // Convertir Date a string para que coincida con el tipo esperado
    const ahorros = ahorrosDB.map(ahorro => ({
        ...ahorro,
        startDate: ahorro.startDate.toISOString().split('T')[0],
        contributions: ahorro.contributions.map(c => ({
            ...c,
            date: c.date.toISOString().split('T')[0]
        }))
    }))

    // Calcular total ahorrado
    const totalAhorrado = ahorros.reduce((sum, saving) => {
        const ultimaContribucion = saving.contributions[0]
        return sum + (ultimaContribucion?.totalSaved ?? 0)
    }, 0)

    return (
        <AhorrosClient
            ahorros={ahorros}
            totalAhorrado={totalAhorrado}
        />
    )
}