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

    const [transaccionesDB, conceptosDB] = await Promise.all([
        prisma.transaction.findMany({
            where: { userId: session.user.id, date: { gte: haceUnAño } },
            orderBy: { date: 'asc' },
            include: { concept: true }
        }),
        prisma.concept.findMany({
            where: { userId: session.user.id, isActive: true }
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

    return (
        <>
            <NavBar titulo="Predicciones Financieras" showBackButton={true} />
            <PrediccionesClient
                transacciones={transacciones}
                conceptos={conceptos}
            />
        </>
    )
}