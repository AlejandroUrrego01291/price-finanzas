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

        const body = await request.json()
        console.log('📌 Body recibido en contribuciones API:', body)

        const { savingId, date, extraAmount = 0 } = body

        // Validaciones detalladas
        if (!savingId) {
            console.error('❌ Falta savingId')
            return NextResponse.json(
                { error: 'Falta el campo savingId' },
                { status: 400 }
            )
        }

        if (!date) {
            console.error('❌ Falta date')
            return NextResponse.json(
                { error: 'Falta el campo date' },
                { status: 400 }
            )
        }

        console.log('📌 Buscando meta:', savingId)

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
            console.error('❌ Meta no encontrada:', savingId)
            return NextResponse.json(
                { error: 'Meta de ahorro no encontrada' },
                { status: 404 }
            )
        }

        console.log('📌 Meta encontrada:', saving.concept)
        console.log('📌 Contribuciones existentes:', saving.contributions.length)

        // Calcular el total acumulado sumando TODAS las contribuciones
        let totalAcumulado = 0
        for (const contribucion of saving.contributions) {
            totalAcumulado += contribucion.amount + (contribucion.extraAmount || 0)
        }

        console.log('📌 Total acumulado existente:', totalAcumulado)

        // Calcular nuevo total sumando el aporte actual
        const montoAporte = saving.monthlySaving
        const montoExtra = extraAmount || 0
        const nuevoTotal = totalAcumulado + montoAporte + montoExtra

        console.log('📌 Aporte mensual:', montoAporte)
        console.log('📌 Aporte extra:', montoExtra)
        console.log('📌 NUEVO TOTAL:', nuevoTotal)

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

        console.log('✅ Contribución registrada:', contribucion.id)

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
            console.log('🎉 ¡Meta alcanzada!')
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

        console.log('=========================')

        return NextResponse.json(metaActualizada)
    } catch (error) {
        console.error('❌ Error en POST contribución:', error)
        return NextResponse.json(
            { error: 'Error al registrar contribución: ' + (error instanceof Error ? error.message : 'Error desconocido') },
            { status: 500 }
        )
    }
}