import { NextResponse } from 'next/server'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

// POST - Registrar pago de deuda
export async function POST(request: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { debtId, date, extraPayment = 0 } = await request.json()

        const debt = await prisma.debt.findFirst({
            where: { id: debtId, userId: session.user.id },
            include: { payments: { orderBy: { date: 'desc' } } }
        })

        if (!debt) {
            return NextResponse.json({ error: 'Deuda no encontrada' }, { status: 404 })
        }

        const ultimoPago = debt.payments[0]
        const saldoAnterior = ultimoPago?.remainingBalance ?? debt.initialAmount
        const interesMensual = (saldoAnterior * debt.interestRate) / 100
        const abonoCapital = Math.min(debt.monthlyPayment, saldoAnterior)
        const pagoTotal = abonoCapital + interesMensual + extraPayment
        const nuevoSaldo = Math.max(0, saldoAnterior - abonoCapital - extraPayment)

        await prisma.debtPayment.create({
            data: {
                debtId: debt.id,
                date: new Date(date),
                paidAmount: pagoTotal,
                interestPaid: interesMensual,
                capitalPaid: abonoCapital,
                extraPayment: extraPayment || null,
                remainingBalance: nuevoSaldo
            }
        })

        await prisma.transaction.create({
            data: {
                userId: session.user.id,
                type: 'GASTO',
                conceptName: `Pago deuda: ${debt.concept}`,
                value: pagoTotal,
                date: new Date(date),
                category: 'Obligaciones',
                subType: 'Pago deudas',
                completed: true
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error en POST pago:', error)
        return NextResponse.json({ error: 'Error al registrar pago' }, { status: 500 })
    }
}

// DELETE - Eliminar un pago específico
export async function DELETE(request: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const paymentId = searchParams.get('paymentId')
        const debtId = searchParams.get('debtId')

        if (!paymentId || !debtId) {
            return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
        }

        // Verificar propiedad
        const debt = await prisma.debt.findFirst({
            where: { id: debtId, userId: session.user.id }
        })

        if (!debt) {
            return NextResponse.json({ error: 'Deuda no encontrada' }, { status: 404 })
        }

        // Obtener el pago y el saldo antes de eliminarlo
        const paymentToDelete = await prisma.debtPayment.findUnique({
            where: { id: paymentId }
        })

        if (!paymentToDelete) {
            return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })
        }

        // Eliminar el pago
        await prisma.debtPayment.delete({
            where: { id: paymentId }
        })

        // Obtener todos los pagos restantes ordenados por fecha ascendente
        const pagosRestantes = await prisma.debtPayment.findMany({
            where: { debtId: debt.id },
            orderBy: { date: 'asc' }
        })

        // Recalcular todos los saldos desde cero
        let saldo = debt.initialAmount
        for (const pago of pagosRestantes) {
            const interes = (saldo * debt.interestRate) / 100
            const abonoCapital = Math.min(debt.monthlyPayment, saldo)
            const nuevoSaldo = Math.max(0, saldo - abonoCapital - (pago.extraPayment || 0))

            await prisma.debtPayment.update({
                where: { id: pago.id },
                data: { remainingBalance: nuevoSaldo }
            })

            saldo = nuevoSaldo
        }

        // Eliminar la transacción asociada
        await prisma.transaction.deleteMany({
            where: {
                conceptName: `Pago deuda: ${debt.concept}`,
                date: paymentToDelete.date
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error en DELETE pago:', error)
        return NextResponse.json({ error: 'Error al eliminar pago' }, { status: 500 })
    }
}