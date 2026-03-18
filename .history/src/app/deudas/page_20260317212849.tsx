import { auth } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import DeudasClient from './DeudasClient'

export default async function DeudasPage() {
    const session = await auth()

    if (!session?.user?.id) {
        redirect('/login')
    }

    // Obtener todas las deudas activas del usuario
    const deudas = await prisma.debt.findMany({
        where: {
            userId: session.user.id,
            isActive: true
        },
        include: {
            payments: {
                orderBy: {
                    date: 'desc'
                }
            }
        },
        orderBy: {
            startDate: 'desc'
        }
    })

    // Calcular total de deudas
    const totalDeudas = deudas.reduce((sum, debt) => sum + debt.initialAmount, 0)

    return (
        <DeudasClient
            deudas={deudas}
            totalDeudas={totalDeudas}
        />
    )
}