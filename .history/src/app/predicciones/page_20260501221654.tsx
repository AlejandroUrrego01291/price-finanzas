import { auth } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import PrediccionesClient from './PrediccionesClient'
import NavBar from '@/components/NavBar'

export default async function PrediccionesPage() {
    const session = await auth()
    if (!session?.user?.id) redirect('/login')

    const haceUnAño = new Date()
    haceUnAño.setFullYear(haceUnAño.getFullYear() - 1)

    const [transaccionesDB, conceptosDB, deudasDB, ahorrosDB] = await Promise.all([
        prisma.transaction.findMany({
            where: { userId: session.user.id, date: { gte: haceUnAño } },
            orderBy: { date: 'asc' },
            include: { concept: true }
        }),
        prisma.concept.findMany({
            where: { userId: session.user.id, isActive: true }
        }),
        prisma.debt.findMany({
            where: { userId: session.user.id, isActive: true },
            include: { payments: { orderBy: { date: 'desc' }, take: 1 } }
        }),
        prisma.saving.findMany({
            where: { userId: session.user.id, isActive: true },
            include: { contributions: { orderBy: { date: 'desc' }, take: 1 } }
        })
    ])

    const transacciones = transaccionesDB.map(t => ({
        id: t.id,
        type: t.type,
        conceptName: t.conceptName,
        value: t.value,
        date: t.date.toISOString().split('T')[0],
        category: t.category,
        subType: t.subType,
        concept: t.concept ? {
            id: t.concept.id,
            name: t.concept.name,
            type: t.concept.type,
            category: t.concept.category,
            subType: t.concept.subType,
            value: t.concept.value,
            fixedDate: t.concept.fixedDate
        } : null
    }))

    const conceptos = conceptosDB.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        category: c.category,
        subType: c.subType,
        value: c.value,
        fixedDate: c.fixedDate
    }))

    // 🔥 Deudas: enviar solo lo necesario (para que coincida con el tipo esperado)
    const deudas = deudasDB.map(d => ({
        id: d.id,
        concept: d.concept,
        monthlyPayment: d.monthlyPayment,
        initialAmount: d.initialAmount,
        payments: d.payments.map(p => ({ remainingBalance: p.remainingBalance }))
    }))

    // 🔥 Ahorros: enviar solo lo necesario
    const ahorros = ahorrosDB.map(a => ({
        id: a.id,
        concept: a.concept,
        monthlySaving: a.monthlySaving,
        targetAmount: a.targetAmount,
        contributions: a.contributions.map(c => ({ totalSaved: c.totalSaved }))
    }))

    return (
        <>
            <NavBar titulo="Predicciones Financieras" showBackButton={true} />
            <PrediccionesClient
                transacciones={transacciones}
                conceptos={conceptos}
                deudas={deudas}
                ahorros={ahorros}
            />
        </>
    )
}