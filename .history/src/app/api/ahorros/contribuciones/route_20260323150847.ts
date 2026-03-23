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

        // Obtener la meta de ahorro con todas sus contribuciones
        const saving = await prisma.saving.findFirst({
            where: {
                id: savingId,
                userId: session.user.id
            },
            include: {
                contributions: {
                    orderBy: {
                        date: 'desc'
                    }
                }
            }
        })

        if (!saving) {
            return NextResponse.json(
                { error: 'Meta de ahorro no encontrada' },
                { status: 404 }
            )
        }

        // Calcular el total actual ahorrado
        const ultimaContribucion = saving.contributions[0]
        const totalAnterior = ultimaContribucion?.totalSaved ?? 0

        // Calcular nuevo total
        const montoAporte = saving.monthlySaving
        const montoExtra = extraAmount || 0
        const nuevoTotal = totalAnterior + montoAporte + montoExtra

        // Registrar la contribución
        const contribucion = await prisma.savingContribution.create({
            data: {
                savingId: saving.id,
                date: new Date(date),
                amount: montoAporte,
                extraAmount: montoExtra || null,
                totalSaved: nuevoTotal
            }
        })

        // Registrar como transacción de gasto
        const transaccion = await prisma.transaction.create({
            data: {
                userId: session.user.id,
                type: 'GASTO',
                conceptName: `Ahorro: ${saving.concept}`,
                value: montoAporte + montoExtra,
                date: new Date(date),
                category: 'Metas',
                subType: 'Ahorros',
                completed: new Date(date) <= new Date()
            }
        })

        // Si se alcanzó la meta, marcar como inactiva
        if (nuevoTotal >= saving.targetAmount) {
            await prisma.saving.update({
                where: { id: saving.id },
                data: { isActive: false }
            })
        }

        // Obtener meta actualizada con todas las contribuciones
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