import { NextResponse } from 'next/server'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

// POST - Registrar contribución
export async function POST(request: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { savingId, date, extraAmount = 0 } = await request.json()

        const saving = await prisma.saving.findFirst({
            where: { id: savingId, userId: session.user.id },
            include: { contributions: { orderBy: { date: 'asc' } } }
        })

        if (!saving) {
            return NextResponse.json({ error: 'Meta no encontrada' }, { status: 404 })
        }

        // Calcular total acumulado
        let totalAcumulado = 0
        for (const c of saving.contributions) {
            totalAcumulado += c.amount + (c.extraAmount || 0)
        }

        const nuevoTotal = totalAcumulado + saving.monthlySaving + (extraAmount || 0)

        await prisma.savingContribution.create({
            data: {
                savingId: saving.id,
                date: new Date(date),
                amount: saving.monthlySaving,
                extraAmount: extraAmount || null,
                totalSaved: nuevoTotal
            }
        })

        await prisma.transaction.create({
            data: {
                userId: session.user.id,
                type: 'GASTO',
                conceptName: `Ahorro: ${saving.concept}`,
                value: saving.monthlySaving + (extraAmount || 0),
                date: new Date(date),
                category: 'Metas',
                subType: 'Ahorros',
                completed: true
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json({ error: 'Error al registrar contribución' }, { status: 500 })
    }
}

// DELETE - Eliminar una contribución
export async function DELETE(request: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const contributionId = searchParams.get('contributionId')
        const savingId = searchParams.get('savingId')

        if (!contributionId || !savingId) {
            return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
        }

        // Verificar propiedad
        const saving = await prisma.saving.findFirst({
            where: { id: savingId, userId: session.user.id }
        })

        if (!saving) {
            return NextResponse.json({ error: 'Meta no encontrada' }, { status: 404 })
        }

        // Obtener la contribución antes de eliminarla
        const contributionToDelete = await prisma.savingContribution.findUnique({
            where: { id: contributionId }
        })

        if (!contributionToDelete) {
            return NextResponse.json({ error: 'Contribución no encontrada' }, { status: 404 })
        }

        // Eliminar la contribución
        await prisma.savingContribution.delete({
            where: { id: contributionId }
        })

        // Recalcular todos los totales
        const contribucionesRestantes = await prisma.savingContribution.findMany({
            where: { savingId: saving.id },
            orderBy: { date: 'asc' }
        })

        let totalAcumulado = 0
        for (const contribucion of contribucionesRestantes) {
            totalAcumulado += contribucion.amount + (contribucion.extraAmount || 0)
            await prisma.savingContribution.update({
                where: { id: contribucion.id },
                data: { totalSaved: totalAcumulado }
            })
        }

        // Eliminar la transacción asociada
        await prisma.transaction.deleteMany({
            where: {
                conceptName: `Ahorro: ${saving.concept}`,
                date: contributionToDelete.date
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json({ error: 'Error al eliminar contribución' }, { status: 500 })
    }
}