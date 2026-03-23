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

        // Obtener la meta de ahorro con todas sus contribuciones ordenadas por fecha descendente
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

        // Obtener el total actual ahorrado (última contribución)
        const ultimaContribucion = saving.contributions[0]
        const totalAnterior = ultimaContribucion?.totalSaved ?? 0

        // Calcular nuevo total
        const montoAporte = saving.monthlySaving
        const montoExtra = extraAmount || 0
        const nuevoTotal = totalAnterior + montoAporte + montoExtra

        console.log('=== REGISTRO DE APORTE ===')
        console.log('Meta:', saving.concept)
        console.log('Total anterior:', totalAnterior)
        console.log('Aporte mensual:', montoAporte)
        console.log('Aporte extra:', montoExtra)
        console.log('Nuevo total:', nuevoTotal)

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
        await prisma.transaction.create({
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
            console.log('¡Meta alcanzada!')
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

        console.log('Contribuciones después del registro:', metaActualizada?.contributions.length)
        console.log('=========================')

        return NextResponse.json(metaActualizada)
    } catch (error) {
        console.error('Error en POST contribución:', error)
        return NextResponse.json(
            { error: 'Error al registrar contribución' },
            { status: 500 }
        )
    }
}