import { NextResponse } from 'next/server'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

// GET - Obtener todas las metas de ahorro
export async function GET() {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const ahorros = await prisma.saving.findMany({
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

        return NextResponse.json(ahorros)
    } catch (error) {
        console.error('Error en GET ahorros:', error)
        return NextResponse.json(
            { error: 'Error al obtener ahorros' },
            { status: 500 }
        )
    }
}

// POST - Crear nueva meta de ahorro
export async function POST(request: Request) {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { concept, targetAmount, monthlySaving, startDate } = await request.json()

        // Validaciones
        if (!concept || !targetAmount || !monthlySaving || !startDate) {
            console.error('Faltan campos:', { concept, targetAmount, monthlySaving, startDate })
            return NextResponse.json(
                { error: 'Faltan campos requeridos' },
                { status: 400 }
            )
        }

        const targetAmountNum = Number(targetAmount)
        const monthlySavingNum = Number(monthlySaving)

        if (isNaN(targetAmountNum) || isNaN(monthlySavingNum)) {
            return NextResponse.json(
                { error: 'Los valores deben ser números válidos' },
                { status: 400 }
            )
        }

        const ahorro = await prisma.saving.create({
            data: {
                userId: session.user.id,
                concept,
                targetAmount: targetAmountNum,
                monthlySaving: monthlySavingNum,
                startDate: new Date(startDate),
                isActive: true
            },
            include: {
                contributions: true
            }
        })

        console.log('Nueva meta de ahorro creada:', ahorro.id)

        return NextResponse.json(ahorro)
    } catch (error) {
        console.error('Error en POST ahorro:', error)
        return NextResponse.json(
            { error: 'Error al crear meta de ahorro' },
            { status: 500 }
        )
    }
}