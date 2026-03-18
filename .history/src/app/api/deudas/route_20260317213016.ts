import { NextResponse } from 'next/server'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

// GET - Obtener todas las deudas
export async function GET() {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

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

        return NextResponse.json(deudas)
    } catch (error) {
        console.error('Error en GET deudas:', error)
        return NextResponse.json(
            { error: 'Error al obtener deudas' },
            { status: 500 }
        )
    }
}

// POST - Crear nueva deuda
export async function POST(request: Request) {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { concept, initialAmount, monthlyPayment, interestRate, startDate } = await request.json()

        if (!concept || !initialAmount || !monthlyPayment || interestRate === undefined || !startDate) {
            return NextResponse.json(
                { error: 'Faltan campos requeridos' },
                { status: 400 }
            )
        }

        const deuda = await prisma.debt.create({
            data: {
                userId: session.user.id,
                concept,
                initialAmount,
                monthlyPayment,
                interestRate,
                startDate: new Date(startDate),
                isActive: true
            },
            include: {
                payments: true
            }
        })

        return NextResponse.json(deuda)
    } catch (error) {
        console.error('Error en POST deuda:', error)
        return NextResponse.json(
            { error: 'Error al crear deuda' },
            { status: 500 }
        )
    }
}