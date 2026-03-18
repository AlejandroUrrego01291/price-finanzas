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
    const deudasDB = await prisma.debt.findMany({
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

    // Convertir Date a string para que coincida con el tipo esperado
    const deudas = deudasDB.map(deuda => ({
        ...deuda,
        startDate: deuda.startDate.toISOString().split('T')[0],
        payments: deuda.payments.map(p => ({
            ...p,
            date: p.date.toISOString().split('T')[0]
        }))
    }))

    // Calcular total de deudas
    const totalDeudas = deudas.reduce((sum, debt) => sum + debt.initialAmount, 0)

    return (
        <DeudasClient
            deudas={deudas}
            totalDeudas={totalDeudas}
        />
    )
}