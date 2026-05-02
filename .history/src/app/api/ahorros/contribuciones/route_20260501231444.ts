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

        if (!savingId) {
            return NextResponse.json({ error: 'Falta savingId' }, { status: 400 })
        }

        if (!date) {
            return NextResponse.json({ error: 'Falta date' }, { status: 400 })
        }

        // Obtener la meta de ahorro con todas sus contribuciones
        const saving = await prisma.saving.findFirst({
            where: {
                id: savingId,
                userId: session.user.id
            },
            include: {
                contributions: {
                    orderBy: [
                        { date: 'desc' },
                        { id: 'desc' }
                    ]
                }
            }
        })

        if (!saving) {
            return NextResponse.json({ error: 'Meta de ahorro no encontrada' }, { status: 404 })
        }

        console.log('📌 Meta encontrada:', saving.concept)
        console.log('📌 Contribuciones existentes:', saving.contributions.length)

        // 🔥 CALCULAR EL TOTAL ACUMULADO SUMANDO TODAS LAS CONTRIBUCIONES 🔥
        let totalAcumulado = 0
        for (const contribucion of saving.contributions) {
            totalAcumulado += contribucion.amount + (contribucion.extraAmount || 0)
        }

        console.log('📌 Total acumulado de contribuciones existentes:', totalAcumulado)

        // Calcular nuevo total sumando el aporte actual
        const montoAporte = saving.monthlySaving
        const montoExtra = extraAmount || 0
        const nuevoTotal = totalAcumulado + montoAporte + montoExtra

        console.log('📌 Aporte mensual:', montoAporte)
        console.log('📌 Aporte extra:', montoExtra)
        console.log('📌 NUEVO TOTAL DESPUÉS DE ESTE APORTE:', nuevoTotal)

        // Registrar la contribución con el nuevo total acumulado
        const contribucion = await prisma.savingContribution.create({
            data: {
                savingId: saving.id,
                date: new Date(date),
                amount: montoAporte,
                extraAmount: montoExtra || null,
                totalSaved: nuevoTotal
            }
        })

        console.log('✅ Contribución registrada con totalSaved:', contribucion.totalSaved)

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
                    orderBy: [
                        { date: 'desc' },
                        { id: 'desc' }
                    ]
                }
            }
        })

        // Mostrar el total final después de todas las contribuciones
        let totalFinal = 0
        for (const c of metaActualizada!.contributions) {
            totalFinal += c.amount + (c.extraAmount || 0)
        }
        console.log('📌 TOTAL FINAL VERIFICADO:', totalFinal)
        console.log('=========================')

        return NextResponse.json(metaActualizada)
    } catch (error) {
        console.error('❌ Error en POST contribución:', error)
        return NextResponse.json(
            { error: 'Error al registrar contribución' },
            { status: 500 }
        )
    }
}

// DELETE - Eliminar una contribución específica
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

        // Eliminar la contribución
        await prisma.savingContribution.delete({
            where: { id: contributionId }
        })

        // Recalcular todos los totales después de eliminar
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

        const metaActualizada = await prisma.saving.findUnique({
            where: { id: saving.id },
            include: { contributions: { orderBy: { date: 'desc' } } }
        })

        return NextResponse.json(metaActualizada)
    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json({ error: 'Error al eliminar contribución' }, { status: 500 })
    }
}