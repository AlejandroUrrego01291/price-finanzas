import { NextResponse } from 'next/server'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

// GET - Obtener transacciones del usuario
export async function GET(request: Request) {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const mes = searchParams.get('mes')
        const año = searchParams.get('año')

        let whereClause: any = {
            userId: session.user.id
        }

        if (mes && año) {
            const fechaInicio = new Date(Number(año), Number(mes) - 1, 1)
            const fechaFin = new Date(Number(año), Number(mes), 0)
            whereClause.date = {
                gte: fechaInicio,
                lte: fechaFin
            }
        }

        const transacciones = await prisma.transaction.findMany({
            where: whereClause,
            orderBy: {
                date: 'desc'
            },
            include: {
                concept: true
            }
        })

        return NextResponse.json(transacciones)
    } catch (error) {
        console.error('Error en GET transacciones:', error)
        return NextResponse.json(
            { error: 'Error al obtener transacciones' },
            { status: 500 }
        )
    }
}

// POST - Crear nueva transacción
export async function POST(request: Request) {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { type, conceptId, conceptName, value, date, category, subType } = await request.json()

        if (!type || !conceptName || !value || !date) {
            return NextResponse.json(
                { error: 'Faltan campos requeridos' },
                { status: 400 }
            )
        }

        const transaccion = await prisma.transaction.create({
            data: {
                userId: session.user.id,
                type,
                conceptId: conceptId || null,
                conceptName,
                value,
                date: new Date(date),
                category: category || null,
                subType: subType || null
            },
            include: {
                concept: true
            }
        })

        console.log('Transacción creada:', transaccion.id)

        return NextResponse.json(transaccion)
    } catch (error) {
        console.error('Error en POST transaccion:', error)
        return NextResponse.json(
            { error: 'Error al crear transacción' },
            { status: 500 }
        )
    }
}

// PUT - Actualizar una transacción
export async function PUT(request: Request) {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        const body = await request.json()
        const { type, conceptId, conceptName, value, date, category, subType } = body

        if (!id) {
            return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
        }

        // Verificar que la transacción pertenece al usuario
        const existing = await prisma.transaction.findFirst({
            where: {
                id,
                userId: session.user.id
            }
        })

        if (!existing) {
            return NextResponse.json({ error: 'Transacción no encontrada' }, { status: 404 })
        }

        // Actualizar la transacción
        const transaccion = await prisma.transaction.update({
            where: { id },
            data: {
                type,
                conceptId: conceptId || null,
                conceptName,
                value,
                date: new Date(date),
                category: category || null,
                subType: subType || null
            },
            include: {
                concept: true
            }
        })

        console.log('Transacción actualizada en DB:', transaccion.id)

        return NextResponse.json(transaccion)
    } catch (error) {
        console.error('Error en PUT transaccion:', error)
        return NextResponse.json(
            { error: 'Error al actualizar transacción' },
            { status: 500 }
        )
    }
}

// DELETE - Eliminar transacción
export async function DELETE(request: Request) {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { error: 'ID requerido' },
                { status: 400 }
            )
        }

        // Verificar que la transacción pertenece al usuario
        const existing = await prisma.transaction.findFirst({
            where: {
                id,
                userId: session.user.id
            }
        })

        if (!existing) {
            return NextResponse.json(
                { error: 'Transacción no encontrada' },
                { status: 404 }
            )
        }

        await prisma.transaction.delete({
            where: { id }
        })

        console.log('Transacción eliminada:', id)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error en DELETE transaccion:', error)
        return NextResponse.json(
            { error: 'Error al eliminar transacción' },
            { status: 500 }
        )
    }
}