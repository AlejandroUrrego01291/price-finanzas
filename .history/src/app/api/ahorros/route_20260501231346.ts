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
                    orderBy: [
                        { date: 'desc' },
                        { id: 'desc' }
                    ]
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

        const body = await request.json()
        console.log('📌 Body recibido en API:', body)

        const { concept, targetAmount, monthlySaving, startDate } = body

        // Validaciones detalladas
        if (!concept) {
            console.error('❌ Falta concept')
            return NextResponse.json(
                { error: 'Falta el campo concept' },
                { status: 400 }
            )
        }

        if (!targetAmount) {
            console.error('❌ Falta targetAmount')
            return NextResponse.json(
                { error: 'Falta el campo targetAmount' },
                { status: 400 }
            )
        }

        if (!monthlySaving) {
            console.error('❌ Falta monthlySaving')
            return NextResponse.json(
                { error: 'Falta el campo monthlySaving' },
                { status: 400 }
            )
        }

        if (!startDate) {
            console.error('❌ Falta startDate')
            return NextResponse.json(
                { error: 'Falta el campo startDate' },
                { status: 400 }
            )
        }

        const targetAmountNum = Number(targetAmount)
        const monthlySavingNum = Number(monthlySaving)

        if (isNaN(targetAmountNum) || isNaN(monthlySavingNum)) {
            console.error('❌ Valores no son números:', { targetAmount, monthlySaving })
            return NextResponse.json(
                { error: 'Los valores deben ser números válidos' },
                { status: 400 }
            )
        }

        console.log('📌 Creando meta con:', {
            userId: session.user.id,
            concept,
            targetAmount: targetAmountNum,
            monthlySaving: monthlySavingNum,
            startDate: new Date(startDate)
        })

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

        console.log('✅ Nueva meta creada:', ahorro.id)

        return NextResponse.json(ahorro)
    } catch (error) {
        console.error('❌ Error en POST ahorro:', error)
        return NextResponse.json(
            { error: 'Error al crear meta de ahorro: ' + (error instanceof Error ? error.message : 'Error desconocido') },
            { status: 500 }
        )
    }
}

// PUT - Actualizar meta de ahorro
export async function PUT(request: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        const { concept, targetAmount, monthlySaving, startDate } = await request.json()

        const ahorro = await prisma.saving.update({
            where: { id: id! },
            data: { concept, targetAmount, monthlySaving, startDate: new Date(startDate) }
        })

        return NextResponse.json(ahorro)
    } catch (error) {
        return NextResponse.json({ error: 'Error al actualizar meta' }, { status: 500 })
    }
}

// DELETE - Eliminar meta de ahorro (soft delete)
export async function DELETE(request: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        await prisma.saving.update({
            where: { id: id! },
            data: { isActive: false }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Error al eliminar meta' }, { status: 500 })
    }
}