import { NextResponse } from 'next/server'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

// POST - Registrar contribución a meta de ahorro
export async function POST(request: Request) {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { savingId, date, extraAmount = 0 } = await request.json()

        if (!savingId || !date) {
            return NextResponse.json(
                { error: 'Faltan campos requeridos' },
                { status: 400 }
            )
        }

        // Obtener la meta de ahorro
        const saving = await prisma.saving.findFirst({
            where: {
                id: savingId,
                userId: session.user.id
            },
            include: {
                contributions: {
                    orderBy: {
                        date: 'desc'
                    },
                    take: 1
                }
            }
        })

        if (!saving) {
            return NextResponse.json(
                { error: 'Meta de ahorro no encontrada' },
                { status: 404 }
            )
        }

        // Calcular nuevo total
        const ultimaContribucion = saving.contributions[0]
        const totalAnterior = ultimaContribucion?.totalSaved ?? 0
        const nuevoTotal = totalAnterior + saving.monthlySaving + extraAmount

        // Registrar la contribución
        const contribucion = await prisma.savingContribution.create({
            data: {
                savingId: saving.id,
                date: new Date(date),
                amount: saving.monthlySaving,
                extraAmount: extraAmount || null,
                totalSaved: nuevoTotal
            }
        })

        // Si se alcanzó la meta, marcar como inactiva
        if (nuevoTotal >= saving.targetAmount) {
            await prisma.saving.update({
                where: { id: saving.id },
                data: { isActive: false }
            })
        }

        // Obtener meta actualizada
        const metaActualizada = await prisma.saving.findUnique({
            where: { id: saving.id },
            include: {
                contributions: {
                    orderBy: {
                        date: 'desc'
                    }
                }
            }
        })

        return NextResponse.json(metaActualizada)
    } catch (error) {
        console.error('Error en POST contribución:', error)
        return NextResponse.json(
            { error: 'Error al registrar contribución' },
            { status: 500 }
        )
    }
}