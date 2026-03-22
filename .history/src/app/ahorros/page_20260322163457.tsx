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

    // Convertir fechas y calcular total ahorrado por meta
    const ahorros = ahorrosDB.map(ahorro => {
        const ultimaContribucion = ahorro.contributions[0]
        const ahorrado = ultimaContribucion?.totalSaved ?? 0
        const restante = ahorro.targetAmount - ahorrado

        return {
            id: ahorro.id,
            concept: ahorro.concept,
            targetAmount: ahorro.targetAmount,
            monthlySaving: ahorro.monthlySaving,
            startDate: ahorro.startDate.toISOString().split('T')[0],
            isActive: ahorro.isActive,
            contributions: ahorro.contributions.map(c => ({
                ...c,
                date: c.date.toISOString().split('T')[0]
            })),
            ahorrado,
            restante
        }
    })

    // Calcular total ahorrado sumando lo ahorrado en cada meta
    const totalAhorrado = ahorros.reduce((sum, saving) => sum + saving.ahorrado, 0)

    return (
        <AhorrosClient
            ahorros={ahorros}
            totalAhorrado={totalAhorrado}
        />
    )
}