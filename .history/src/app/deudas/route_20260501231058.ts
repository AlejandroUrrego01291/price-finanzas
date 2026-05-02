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
            where: { userId: session.user.id, isActive: true },
            include: { payments: { orderBy: { date: 'desc' } } },
            orderBy: { startDate: 'desc' }
        })

        return NextResponse.json(deudas)
    } catch (error) {
        return NextResponse.json({ error: 'Error al obtener deudas' }, { status: 500 })
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

        const deuda = await prisma.debt.create({
            data: {
                userId: session.user.id,
                concept,
                initialAmount,
                monthlyPayment,
                interestRate,
                startDate: new Date(startDate),
                isActive: true
            }
        })

        return NextResponse.json(deuda)
    } catch (error) {
        return NextResponse.json({ error: 'Error al crear deuda' }, { status: 500 })
    }
}

// PUT - Actualizar deuda completa
export async function PUT(request: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        const { concept, initialAmount, monthlyPayment, interestRate, startDate } = await request.json()

        const deuda = await prisma.debt.update({
            where: { id: id! },
            data: { concept, initialAmount, monthlyPayment, interestRate, startDate: new Date(startDate) }
        })

        return NextResponse.json(deuda)
    } catch (error) {
        return NextResponse.json({ error: 'Error al actualizar deuda' }, { status: 500 })
    }
}

// DELETE - Eliminar deuda completa (soft delete)
export async function DELETE(request: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        await prisma.debt.update({
            where: { id: id! },
            data: { isActive: false }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Error al eliminar deuda' }, { status: 500 })
    }
}