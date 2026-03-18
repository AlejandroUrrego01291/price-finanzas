import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

// GET - Obtener todos los conceptos del usuario
export async function GET() {
    try {
        const session = await getServerSession()

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const conceptos = await prisma.concept.findMany({
            where: {
                userId: session.user.id,
                isActive: true
            },
            orderBy: [
                { type: 'asc' },
                { name: 'asc' }
            ]
        })

        return NextResponse.json(conceptos)
    } catch (error) {
        return NextResponse.json(
            { error: 'Error al obtener conceptos' },
            { status: 500 }
        )
    }
}

// POST - Crear un nuevo concepto
export async function POST(request: Request) {
    try {
        const session = await getServerSession()

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { type, name, category, subType } = await request.json()

        if (!type || !name) {
            return NextResponse.json(
                { error: 'Tipo y nombre son requeridos' },
                { status: 400 }
            )
        }

        const concepto = await prisma.concept.create({
            data: {
                userId: session.user.id,
                type,
                name,
                category,
                subType,
                isActive: true
            }
        })

        return NextResponse.json(concepto)
    } catch (error) {
        return NextResponse.json(
            { error: 'Error al crear concepto' },
            { status: 500 }
        )
    }
}

// PUT - Actualizar un concepto
export async function PUT(request: Request) {
    try {
        const session = await getServerSession()

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { id, type, name, category, subType } = await request.json()

        if (!id || !type || !name) {
            return NextResponse.json(
                { error: 'ID, tipo y nombre son requeridos' },
                { status: 400 }
            )
        }

        // Verificar que el concepto pertenece al usuario
        const existing = await prisma.concept.findFirst({
            where: {
                id,
                userId: session.user.id
            }
        })

        if (!existing) {
            return NextResponse.json(
                { error: 'Concepto no encontrado' },
                { status: 404 }
            )
        }

        const concepto = await prisma.concept.update({
            where: { id },
            data: { type, name, category, subType }
        })

        return NextResponse.json(concepto)
    } catch (error) {
        return NextResponse.json(
            { error: 'Error al actualizar concepto' },
            { status: 500 }
        )
    }
}

// DELETE - Eliminar un concepto
export async function DELETE(request: Request) {
    try {
        const session = await getServerSession()

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

        // Verificar que el concepto pertenece al usuario
        const existing = await prisma.concept.findFirst({
            where: {
                id,
                userId: session.user.id
            }
        })

        if (!existing) {
            return NextResponse.json(
                { error: 'Concepto no encontrado' },
                { status: 404 }
            )
        }

        // Soft delete (marcar como inactivo)
        await prisma.concept.update({
            where: { id },
            data: { isActive: false }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json(
            { error: 'Error al eliminar concepto' },
            { status: 500 }
        )
    }
}