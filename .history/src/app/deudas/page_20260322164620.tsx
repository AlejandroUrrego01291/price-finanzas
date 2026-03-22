import { auth } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import DeudasClient from './DeudasClient'

export default async function DeudasPage() {
    const session = await auth()

    if (!session?.user?.id) {
        redirect('/login')
    }

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

    const deudas = deudasDB.map(deuda => {
        const ultimoPago = deuda.payments[0]
        const saldoActual = ultimoPago?.remainingBalance ?? deuda.initialAmount

        return {
            id: deuda.id,
            concept: deuda.concept,
            initialAmount: deuda.initialAmount,
            monthlyPayment: deuda.monthlyPayment,
            interestRate: deuda.interestRate,
            startDate: deuda.startDate.toISOString().split('T')[0],
            isActive: deuda.isActive,
            payments: deuda.payments.map(p => ({
                ...p,
                date: p.date.toISOString().split('T')[0]
            })),
            saldoActual
        }
    })

    const totalDeudas = deudas.reduce((sum, debt) => sum + debt.saldoActual, 0)

    return (
        <DeudasClient
            deudas={deudas}
            totalDeudas={totalDeudas}
        />
    )
}