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

        if (!debtId || !date) {
            return NextResponse.json(
                { error: 'Faltan campos requeridos' },
                { status: 400 }
            )
        }

        // Obtener la deuda
        const debt = await prisma.debt.findFirst({
            where: {
                id: debtId,
                userId: session.user.id
            },
            include: {
                payments: {
                    orderBy: {
                        date: 'desc'
                    },
                    take: 1
                }
            }
        })

        if (!debt) {
            return NextResponse.json(
                { error: 'Deuda no encontrada' },
                { status: 404 }
            )
        }

        // Calcular valores del pago
        const ultimoPago = debt.payments[0]
        const saldoAnterior = ultimoPago?.remainingBalance ?? debt.initialAmount

        const interesMensual = (saldoAnterior * debt.interestRate) / 100
        const abonoCapital = Math.min(debt.monthlyPayment, saldoAnterior)
        const pagoTotal = abonoCapital + interesMensual + extraPayment
        const nuevoSaldo = saldoAnterior - abonoCapital - extraPayment

        // Registrar el pago
        const pago = await prisma.debtPayment.create({
            data: {
                debtId: debt.id,
                date: new Date(date),
                paidAmount: pagoTotal,
                interestPaid: interesMensual,
                capitalPaid: abonoCapital,
                extraPayment: extraPayment || null,
                remainingBalance: Math.max(0, nuevoSaldo)
            }
        })

        // Si el saldo llega a cero, marcar deuda como inactiva
        if (nuevoSaldo <= 0) {
            await prisma.debt.update({
                where: { id: debt.id },
                data: { isActive: false }
            })
        }

        // Obtener deuda actualizada
        const deudaActualizada = await prisma.debt.findUnique({
            where: { id: debt.id },
            include: {
                payments: {
                    orderBy: {
                        date: 'desc'
                    }
                }
            }
        })

        return NextResponse.json(deudaActualizada)
    } catch (error) {
        console.error('Error en POST pago:', error)
        return NextResponse.json(
            { error: 'Error al registrar pago' },
            { status: 500 }
        )
    }
}